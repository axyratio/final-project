from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from typing import Optional


class ResponseRequestOtp(BaseModel):
    message: str = Field(None, example="OTP send to Phone number.")
    otp_token: str = Field(None, example="token from verified otp.")
    otp_code: str = Field(None, example="otp for test <ห้ามใช้ในการส่งจริง>")

    class Config:
        orm_mode = True

class ErrorResponseRequestOtp(BaseModel):
    error: str = Field(None, example="example: Invalid OTP")

    class Config:
        orm_mode = True


        

class ResendRequestOtp(BaseModel):
    identity: str = Field(..., description="Username หรือ Email ของผู้ใช้")





class RegisterVerifyOtp(BaseModel):
    otp_token: str
    otp_code: str

class ResponseVerifyOtp(BaseModel):
    message: str = None
    username: str = None

    class Config:
        orm_mode = True

class ErrorResponseVerifyOtp(BaseModel):
    error: str = None

    class Config:
        orm_mode = True
    

