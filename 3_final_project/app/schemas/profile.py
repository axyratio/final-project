from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import date

class ResponseMyProfile(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str
    birth_date: Optional[date] = None
    phone_number: str
    user_role: Optional[str] = None
    
    class Config:
        orm_mode = True

class ChangeProfile(BaseModel):
    first_name: Optional[str]  = None
    last_name: Optional[str]  = None
    username: Optional[str]  = None
    birth_date: Optional[date]  = None

    class Config:
        orm_mode = True

class ResponseChangeProfile(BaseModel):
    messagae: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[date] = None

    class Config:
        orm_mode = True

class DeleteProfile(BaseModel):
    password: str

class ResponseDeleteProfile(BaseModel):
    success: bool
    message: str
    deleted_user_id: int | None = None
    class Config:
        orm_mode = True

class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)