import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from .database import Base
import enum

class TransactionType(enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"

class InputMethod(enum.Enum):
    MANUAL = "manual"
    VOICE = "voice"
    OCR = "ocr"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # These link the user to their data
    transactions = relationship("Transaction", back_populates="owner")
    chats = relationship("ChatMessage", back_populates="owner")
    widgets = relationship("DashboardWidget", back_populates="owner")
    reminders = relationship("Reminder", back_populates="owner")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    type = Column(String(20)) # expense/income
    category = Column(String(50))
    merchant = Column(String(100))
    description = Column(Text, nullable=True) 
    method = Column(String(20), default="manual") 
    date = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    owner = relationship("User", back_populates="transactions")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id")) # The bridge
    role = Column(String(20)) 
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="chats")

class DashboardWidget(Base):
    __tablename__ = "dashboard_widgets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id")) # The bridge
    title = Column(String(100))
    chart_type = Column(String(20))
    sql_query = Column(Text)
    config_json = Column(Text)
    is_default = Column(Boolean, default=False)

    owner = relationship("User", back_populates="widgets")


class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    merchant = Column(String(100)) 
    amount = Column(Float, nullable=False)
    due_date = Column(DateTime, nullable=False)
    is_recursive = Column(Boolean, default=False)
    
    # NEW: Integer representing the interval in weeks
    frequency_weeks = Column(Integer, nullable=True) 
    frequency_type = Column(String(20), nullable=True)  # 'days', 'weeks', 'months'
    frequency_value = Column(Integer, nullable=True)
    
    title = Column(String(150)) 
    category = Column(String(50)) 
    is_paid = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="reminders")