# app/schemas/user.py
from uuid import UUID
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date

class UserRegister(BaseModel):
    # user_id: Optional[str] = None
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    gender: str
    birth_date: date
    phone_number: str

class UserResponseRegister(BaseModel):
    message: str
    username: str

class ErrorResponseRegister(BaseModel):
    error: str

    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    identity: str  # Username or Email
    password: str

class UserResponseLogin(BaseModel):
    message: str
    username: str
    access_token: str
    token_type: str = "bearer"

    class Config:
        orm_mode = True

class ErrorResponseLogin(BaseModel):
    error: str

    class Config:
        orm_mode = True










