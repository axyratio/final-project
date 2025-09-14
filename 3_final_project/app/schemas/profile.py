from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date

class ChangeProfile(BaseModel):
    first_name: Optional[str]  = None
    last_name: Optional[str]  = None
    username: Optional[str]  = None
    birth_date: Optional[date]  = None

    class Config:
        orm_mode = True

class ResponseChangeProfile(BaseModel):
    messagae: str = "Profile updated successfully"
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[date] = None

    class Config:
        orm_mode = True

class ResponseDeleteProfile(BaseModel):
    message: str = "Profile deleted successfully"
    class Config:
        orm_mode = True