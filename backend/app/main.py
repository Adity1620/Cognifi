import os
import shutil
import re
import json
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.orm.attributes import flag_modified
from jose import JWTError, jwt
from datetime import datetime
from datetime import timedelta
# Local imports
from . import models, schemas, database, auth, voice, ai_engine, chat_engine
from .database import engine
from dateutil.relativedelta import relativedelta
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI and Database
app = FastAPI(title="CogniFi - AI Financial Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
models.Base.metadata.create_all(bind=database.engine)

# Security Configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Dependencies ---

def get_db():
    """Provides a database session for each request."""
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Validates the JWT token and returns the current user object."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- Authentication Endpoints ---

@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Registers a new user with a hashed password."""
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    create_default_widgets(new_user.id, db)
    return new_user

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticates user and returns a JWT access token."""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Transaction Endpoints ---

@app.post("/voice-transaction/", response_model=schemas.TransactionResponse)
async def create_voice_transaction(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    temp_path = f"temp_{current_user.id}_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Step 1: Speech-to-Text
        raw_text = voice.transcribe_audio(temp_path)
        
        # Step 2: AI Entity Extraction
        extracted_data = ai_engine.extract_transaction_info(raw_text)
        
        # Step 3: Explicit Database Mapping (Safe approach)
        new_transaction = models.Transaction(
            amount=extracted_data.get("amount", 0.0),
            category=extracted_data.get("category", "Uncategorized"),
            merchant=extracted_data.get("merchant", "Unknown"),
            type=extracted_data.get("type", "expense"),
            # We combine the AI's transcription with the original text for clarity
            description=f"Voice entry: {raw_text}",
            # FIX: Ensure we use .value to pass the string 'voice' to the DB/Pydantic
            method=models.InputMethod.VOICE.value,
            user_id=current_user.id 
        )
        
        # Handle optional date if the AI extracted one
        if extracted_data.get("date"):
            new_transaction.date = extracted_data["date"]

        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        return new_transaction
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

#Show Transaction history

@app.get("/transactions/", response_model=list[schemas.TransactionResponse])
def read_user_transactions(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Retrieves ONLY the transactions belonging to the authenticated user."""
    return db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id, models.Transaction.is_deleted == False).all()



@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    """Returns details of the currently logged-in user."""
    return current_user


# --- Chat Endpoints ---


@app.post("/chat/", response_model=schemas.ChatResponse)
async def chat_with_cognifi(
    request: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        ai_data = chat_engine.get_chat_response(db, request.query, current_user.id)
        
        # FIX: Ensure 'data' is a list of dictionaries, not a list of lists
        # If ai_data["data"] looks like [[1000.0]], we need to map it
        if ai_data.get("data") and isinstance(ai_data["data"][0], list):
            # Map the list to the series_keys provided by the AI
            keys = ai_data.get("series_keys", ["value"])
            normalized_data = []
            for row in ai_data["data"]:
                normalized_data.append(dict(zip(keys, row)))
            ai_data["data"] = normalized_data

        ai_data["history_used"] = 5
        return ai_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def create_default_widgets(user_id: int, db: Session):
    """Adds a set of starter charts to a new user's dashboard."""
    defaults = [
        {
            "title": "Monthly Spending Trend",
            "chart_type": "line",
            "sql_query": f"SELECT DATE_FORMAT(date, '%Y-%m') as name, SUM(amount) as Total FROM transactions WHERE user_id = {user_id} GROUP BY name ORDER BY name ASC",
            "config_json": json.dumps({"series_keys": ["Total"]})
        },
        {
            "title": "Category Breakdown",
            "chart_type": "pie",
            "sql_query": f"SELECT category as name, SUM(amount) as value FROM transactions WHERE user_id = {user_id} GROUP BY category",
            "config_json": json.dumps({"series_keys": ["value"]})
        },
        {
            "title": "Reminder Status",
            "chart_type": "pie", # We will render this as a Donut chart in React
            "sql_query": f"""
                SELECT 
                    CASE 
                        WHEN due_date < UTC_TIMESTAMP() THEN '🔴 Overdue'
                        WHEN due_date BETWEEN UTC_TIMESTAMP() AND DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY) THEN '🟡 Due Soon'
                        ELSE '🟢 Upcoming'
                    END as name,
                    COUNT(*) as value
                FROM reminders 
                WHERE user_id = {user_id} AND is_paid = 0
                GROUP BY name
            """,
            "config_json": json.dumps({
                "series_keys": ["value"],
                "colors": {
                    "🔴 Overdue": "#ef4444",   # Red
                    "🟡 Due Soon": "#f59e0b", # Amber
                    "🟢 Upcoming": "#10b981"  # Emerald
                }
            })
        }
    ]
    
    for widget in defaults:
        db_widget = models.DashboardWidget(user_id=user_id, is_default=True, **widget)
        db.add(db_widget)
    db.commit()

@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # ... (Your existing hashing/user creation code) ...
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # NEW: Initialize the dashboard for the new user
    create_default_widgets(new_user.id, db)
    
    return new_user


@app.post("/dashboard/pin")
def pin_chart_to_dashboard(
    payload: schemas.WidgetPinRequest, # Use the schema here
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Allows users to save an AI-generated chart from chat to their home screen."""
    new_widget = models.DashboardWidget(
        user_id=current_user.id,
        title=payload.title,
        chart_type=payload.chart_type,
        sql_query=payload.sql_query,
        # We store the keys as JSON so the frontend knows which bars/lines to draw
        config_json=json.dumps({"series_keys": payload.series_keys}),
        is_default=False
    )
    db.add(new_widget)
    db.commit()
    return {"message": "Widget pinned successfully!"}


def is_safe_sql(query: str) -> bool:
    """Security guard to prevent destructive SQL actions."""
    clean_query = query.strip().upper()
    if not clean_query.startswith("SELECT"):
        return False
    forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "TRUNCATE", "ALTER", "GRANT"]
    return not any(word in clean_query for word in forbidden)

@app.get("/dashboard/view")
def get_user_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    widgets = db.query(models.DashboardWidget).filter(models.DashboardWidget.user_id == current_user.id).all()
    
    response = []
    for w in widgets:
        # Security Check
        if not is_safe_sql(w.sql_query):
            continue
            
        with engine.connect() as conn:
            result = conn.execute(text(w.sql_query))
            chart_data = [dict(row._mapping) for row in result]
        
        response.append({
            "id": w.id,
            "title": w.title,
            "chart_type": w.chart_type,
            "data": chart_data,
            "config": json.loads(w.config_json) if w.config_json else {}
        })
    return response


#update the entries in the table

@app.put("/transactions/bulk-update")
def bulk_update_transactions(
    payload: list[schemas.TransactionUpdateWithId],
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Updates multiple transactions at once for a seamless bulk-edit experience."""
    updated_items = []
    
    for item in payload:
        # 1. Find the specific transaction and verify ownership
        db_tx = db.query(models.Transaction).filter(
            models.Transaction.id == item.id, 
            models.Transaction.user_id == current_user.id
        ).first()
        
        if db_tx:
            # 2. Update only the fields provided
            db_tx.amount = item.amount
            db_tx.category = item.category
            db_tx.merchant = item.merchant
            db_tx.description = item.description
            updated_items.append(db_tx)

    # 3. Save all changes to MySQL in a single transaction
    db.commit()
    return {"message": f"Successfully updated {len(updated_items)} transactions"}


#delete transaction

@app.delete("/transactions/{transaction_id}")
def soft_delete_transaction(transaction_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id, 
        models.Transaction.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    transaction.is_deleted = True
    transaction.deleted_at = datetime.utcnow() # Timestamp for the purge clock
    db.commit()
    
    return {"message": "Transaction moved to trash. It will be permanently deleted in 30 days."}


@app.post("/maintenance/purge-trash")
def purge_old_transactions(db: Session = Depends(get_db)):
    """Permanently removes transactions that have been in the trash for over 30 days."""
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # Find rows where is_deleted is True AND they were deleted more than 30 days ago
    expired_rows = db.query(models.Transaction).filter(
        models.Transaction.is_deleted == True,
        models.Transaction.deleted_at <= thirty_days_ago
    )
    
    count = expired_rows.count()
    expired_rows.delete(synchronize_session=False)
    db.commit()
    
    return {"message": f"Purged {count} expired transactions from the database."}


@app.get("/transactions/trash", response_model=list[schemas.TransactionResponse])
def read_trash_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Returns all soft-deleted transactions for the current user."""
    return db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.is_deleted == True
    ).order_by(models.Transaction.deleted_at.desc()).all()


@app.post("/transactions/{transaction_id}/restore")
def restore_transaction(transaction_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id, 
        models.Transaction.user_id == current_user.id
    ).first()
    
    if transaction:
        transaction.is_deleted = False
        db.commit()
        return {"message": "Transaction restored!"}



# --- Reminder Endpoints ---

@app.post("/reminders/", response_model=schemas.ReminderResponse)
def create_reminder(
    reminder_in: schemas.ReminderCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Creates a reminder and uses AI to auto-fill title and category."""
    # 1. AI Enrichment
    suggestions = ai_engine.suggest_reminder_details(
        reminder_in.merchant, 
        reminder_in.amount, 
        reminder_in.frequency_type,
        reminder_in.frequency_value
    )
    
    # 2. Save to DB
    new_reminder = models.Reminder(
        **reminder_in.model_dump(),
        user_id=current_user.id,
        title=suggestions.get("title"),
        category=suggestions.get("category")
    )
    db.add(new_reminder)
    db.commit()
    db.refresh(new_reminder)
    return new_reminder


@app.get("/reminders/", response_model=list[schemas.ReminderResponse])
def get_user_reminders(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Returns the user's active (unpaid) reminders."""
    return db.query(models.Reminder).filter(
        models.Reminder.user_id == current_user.id,
        models.Reminder.is_paid == False
    ).order_by(models.Reminder.due_date.asc()).all()


@app.post("/reminders/{reminder_id}/pay")
def pay_reminder(
    reminder_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    reminder = db.query(models.Reminder).filter(
        models.Reminder.id == reminder_id, 
        models.Reminder.user_id == current_user.id
    ).first()
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # 1. Create the Transaction
    new_tx = models.Transaction(
        user_id=current_user.id,
        amount=reminder.amount,
        category=reminder.category,
        merchant=reminder.merchant,
        description=f"Payment for: {reminder.title}",
        type="expense",
        date=datetime.utcnow()
    )
    db.add(new_tx)

    # 2. Logic for Next Cycle
    if not reminder.is_recursive:
        reminder.is_paid = True 
    else:
        # Debug: Check if data exists
        if not reminder.frequency_type or not reminder.frequency_value:
             # Fallback if UI didn't send data correctly
             reminder.due_date += relativedelta(months=1)
        else:
            # Construct the interval
            interval = {reminder.frequency_type: reminder.frequency_value}
            
            # Update the date
            old_date = reminder.due_date
            reminder.due_date = old_date + relativedelta(**interval)
            
            # 🚀 FORCE SQLALCHEMY TO SEE THE CHANGE
            flag_modified(reminder, "due_date")

    db.commit()
    db.refresh(reminder) # 🚀 Refresh to get the updated state from DB
    
    return {
        "message": "Success", 
        "next_due": reminder.due_date.strftime('%Y-%m-%d'),
        "was_recursive": reminder.is_recursive
    }


@app.delete("/reminders/{reminder_id}")
def delete_reminder(
    reminder_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Permanently removes a reminder."""
    reminder = db.query(models.Reminder).filter(
        models.Reminder.id == reminder_id, 
        models.Reminder.user_id == current_user.id
    ).first()
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    db.delete(reminder)
    db.commit()
    return {"message": "Reminder deleted successfully"}



@app.post("/transactions/scan-receipt", response_model=schemas.OCRResponse)
async def scan_receipt(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    """Processes an uploaded receipt and returns extracted data for review."""
    
    # 1. Read the uploaded file into memory
    content = await file.read()
    
    # 2. Send to AI Engine
    try:
        extracted_data = ai_engine.process_receipt_image(content)
        
        # 3. Return the data to the user (frontend will show a preview)
        return extracted_data
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"AI failed to read receipt: {str(e)}"
        )

@app.post("/transactions/scan-receipt", response_model=schemas.OCRResponse)
async def scan_receipt(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    """Endpoint for the 'Scan' button on the UI."""
    content = await file.read()
    try:
        # Extract data using GPT-4o Vision
        extracted_data = ai_engine.process_receipt_image(content)
        return extracted_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR Failed: {str(e)}")


@app.post("/transactions/confirm-ocr", response_model=schemas.TransactionResponse)
def confirm_ocr_transaction(
    data: schemas.TransactionCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Finalizing the OCR data after user review."""
    
    # 🚀 The Fix: Tell model_dump to exclude 'method' so we can set it to "ocr"
    transaction_data = data.model_dump(exclude={"method"})
    
    new_tx = models.Transaction(
        **transaction_data,
        user_id=current_user.id,
        method="ocr" # Now there is only one "method" being passed!
    )
    
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    return new_tx