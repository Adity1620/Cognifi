import os
import shutil
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime
# Local imports
from . import models, schemas, database, auth, voice, ai_engine, chat_engine

# Initialize FastAPI and Database
app = FastAPI(title="CogniFi - AI Financial Agent")
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
    """
    1. Transcribes audio via Groq
    2. Extracts structured data via GPT-4o-mini
    3. Saves transaction tied to the current user
    """
    temp_path = f"temp_{current_user.id}_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Step 1: Speech-to-Text
        raw_text = voice.transcribe_audio(temp_path)
        
        # Step 2: AI Entity Extraction
        extracted_data = ai_engine.extract_transaction_info(raw_text)
        
        # Logic: Use AI date if found, otherwise let DB default to 'now'
        if extracted_data.get("date") is None:
            extracted_data.pop("date", None)

        # Step 3: Database Persistence
        new_transaction = models.Transaction(
            **extracted_data,
            description=f"Voice entry: {raw_text}",
            method=models.InputMethod.VOICE,
            user_id=current_user.id # Isolation: Data tagged to owner
        )
        
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        return new_transaction
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/transactions/", response_model=list[schemas.TransactionResponse])
def read_user_transactions(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Retrieves ONLY the transactions belonging to the authenticated user."""
    return db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()

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
        response_text = chat_engine.get_chat_response(db, request.query, current_user.id)
        return {"response": response_text, "history_used": 5}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat Error: {str(e)}")