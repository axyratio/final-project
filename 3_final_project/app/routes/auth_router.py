from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.otp import ResendRequestOtp, ResponseVerifyOtp, ResponseRequestOtp, ErrorResponseRequestOtp, ErrorResponseVerifyOtp, RegisterVerifyOtp
from app.schemas.user import UserRegister, UserResponseRegister, ErrorResponseRegister, UserLogin, UserResponseLogin, ErrorResponseLogin
from app.services.auth_service import (
    register_service,
    login_service
)

from app.services import auth_service
from typing import Union

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register",
    response_model=UserResponseRegister,
    responses={400: {"model": ErrorResponseRegister}},
    summary="สมัครสมาชิกใหม่และส่งรหัส OTP",
)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    
    res, err = register_service(db, payload)
    if err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
    return UserResponseRegister(
        message=res.get("message"),
        username=res.get("username")
        # otp_token=res.get("otp_token"),
        # otp_code=res.get("otp_code"),  # จะมีเฉพาะตอน DEBUG=True
    )

@router.post(
    "/login",
    response_model=UserResponseLogin,
    responses={400: {"model": ErrorResponseLogin}},
    summary="เข้าสู่ระบบด้วย Username หรือ Email",
)
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    print(f"router username: {payload.identity}, password: {payload.password}")
    res, err = login_service(db, payload)
    if err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
    
    response.set_cookie(
        key="access_token",
        value=res.get("access_token"),
        httponly=True,      # ป้องกัน JS อ่าน cookie
        max_age=1800,       # อายุ 30 นาที
        secure=False,       # ใช้ True ใน production (HTTPS)
        samesite="lax"      # ป้องกัน CSRF
    )
    
    return UserResponseLogin(
        message="Login Successful",
        username=res.get("username"),
        access_token=res.get("access_token"),
        token_type=res.get("token_type")
    )


# @router.post(
#     "/register/resend-otp",
#     response_model=ResponseRequestOtp,
#     responses={400: {"model": ErrorResponseRequestOtp}},
#     summary="ขอรหัส OTP สำหรับการสมัครใหม่อีกครั้ง",
# )
# def register_resend_otp(payload: ResendRequestOtp, db: Session = Depends(get_db)):
#     """
#     ขอ OTP ซ้ำ โดยตรวจ rate-limit และปฏิเสธหาก OTP เดิมยังไม่หมดอายุ
#     - Request: ใช้ ResendRequestOtp (identity)
#     - Response: ใช้ ResponseRequestOtp / ErrorResponseRequestOtp
#     """
#     res, err = resend_register_otp_service(db, payload.identity)
#     if err:
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
#     return ResponseRequestOtp(
#         message=res.get("message"),
#         otp_token=res.get("otp_token"),
#         otp_code=res.get("otp_code"),
#     )


# @router.post(
#     "/register/verify-otp",
#     response_model=ResponseVerifyOtp,
#     responses={400: {"model": ErrorResponseVerifyOtp}},
#     summary="ยืนยันรหัส OTP สำหรับการสมัครสมาชิก",
# )
# def register_verify_otp(payload: RegisterVerifyOtp, db: Session = Depends(get_db)):
#     """
#     ยืนยัน OTP จาก otp_token + otp_code เพื่อเปิดใช้งานบัญชี
#     - Request: ใช้ RegisterVerifyOtp
#     - Response: ใช้ ResponseVerifyOtp / ErrorResponseVerifyOtp
#     """
#     res, err = register_verify_otp_service(db, payload)
#     if err:
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
#     return ResponseVerifyOtp(
#         message=res.get("message"),
#         username=res.get("username"),
#     )