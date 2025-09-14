# app/core/security.py
from datetime import datetime, timedelta
from uuid import UUID
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

hash_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return hash_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return hash_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()

    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
    
# def hash_otp(otp_code: str):
#     return hash_context.hash(otp_code)

# def verify_otp_hash(plain_otp: str, hashed_otp: str):
#     return hash_context.verify(plain_otp, hashed_otp)

# def create_otp_token(
#     data: dict, 
#     expires_delta: timedelta = timedelta(minutes=settings.OTP_TOKEN_EXPIRE_MINUTES)
# ):
#     print(data)
#     to_encode = data.copy()
#     expire = datetime.utcnow() + expires_delta
#     to_encode.update({"exp": expire})
#     encoded_jwt = jwt.encode(
#         to_encode, 
#         settings.OTP_SECRET_KEY, 
#         algorithm=settings.ALGORITHM
#     )
#     return encoded_jwt

# def decode_otp_token(token: str):
#     """
#     ถอดรหัส OTP Token เพื่อดึงข้อมูล user_id
#     """
#     try:
#         payload = jwt.decode(
#             token,
#             settings.OTP_SECRET_KEY,
#             algorithms=[settings.ALGORITHM],
#             options={"require": ["exp"]}  # บังคับให้มี exp
#         )
#         return {
#             "user_id": payload.get("user_id"),
#             "otp_id": payload.get("otp_id"),
#             "purpose": payload.get("purpose")
#         }
#     except ExpiredSignatureError:
#         print("OTP Token expired")
#         return None
#     except JWTError as e:
#         print("Invalid OTP Token:", str(e))
#         return None