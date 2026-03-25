import os
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
# This key is used to sign your JWT "passports"
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_super_secret_safe_key_123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # Tokens valid for 24 hours

# --- Password Hashing (The direct bcrypt approach) ---

def get_password_hash(password: str) -> str:
    """
    Turns a plain text password into a secure hash.
    Directly uses bcrypt to avoid passlib compatibility issues.
    """
    # 1. Encode password to bytes
    pwd_bytes = password.encode('utf-8')
    # 2. Generate a salt and hash the password
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    # 3. Return as a decoded string for MySQL storage
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks if the provided password matches the stored hash.
    """
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_enc = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_enc)

# --- Token Generation ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Generates a JWT token for the user.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt