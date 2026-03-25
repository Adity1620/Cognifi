from pydantic import BaseModel
from datetime import datetime
from .models import TransactionType, InputMethod
from typing import List, Dict, Any, Optional, Literal

class TransactionBase(BaseModel):
    amount: float
    type: TransactionType
    category: Optional[str] = None
    description: Optional[str] = None
    merchant: Optional[str] = None
    method: InputMethod = InputMethod.MANUAL
    # Add: This allows the AI to pass the calculated date
    date: Optional[datetime] = None 

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    # Ensure date is included in the response
    date: datetime 

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    is_visual: bool
    answer: str
    chart_type: Optional[str] = ""
    title: Optional[str] = ""
    # Fixed the Dict arguments here:
    data: Optional[List[Dict[str, Any]]] = [] 
    series_keys: Optional[List[str]] = []
    sql_used: Optional[str] = ""
    history_used: int

class WidgetPinRequest(BaseModel):
    title: str
    chart_type: str
    sql_query: str
    series_keys: List[str]


class TransactionUpdateWithId(BaseModel):
    id: int # Required to find the row
    amount: float
    category: str
    merchant: str
    description: Optional[str] = None
    type: str = "expense"


class ReminderBase(BaseModel):
    merchant: str
    amount: float
    due_date: datetime
    is_recursive: bool = False
    frequency_type: Optional[Literal["days", "weeks", "months"]] = None
    frequency_value: Optional[int] = None

class ReminderCreate(ReminderBase):
    pass

class ReminderResponse(ReminderBase):
    id: int
    user_id: int
    title: str
    category: str
    is_paid: bool
    created_at: datetime

    class Config:
        from_attributes = True


class OCRResponse(BaseModel):
    amount: float
    type: str
    category: str
    merchant: str
    description: Optional[str]
    date: str # AI returns string, converted to DateTime during final save

class TransactionCreate(BaseModel):
    amount: float
    type: str
    category: str
    merchant: str
    description: Optional[str]
    date: Optional[datetime]
    method: str = "manual"