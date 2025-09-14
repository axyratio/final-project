# app/services/auth_service.py
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status, Response
from sqlalchemy.orm import Session
from app.repositories import user_repository
from app.core.security import verify_password, create_access_token, decode_access_token, hash_password
from app.core.config import settings
# from app.utils.generate_numeric_otp import generate_numeric_otp
from app.utils.now_utc import now_utc
from app.schemas.user import UserLogin
# from app.services.notification_service import send_register_otp_notification

# OTP_EXPIRE_MINUTES = settings.OTP_TOKEN_EXPIRE_MINUTES


def register_service(db: Session, user_data):
    try:
        # 1) ตรวจ username
        username_user = user_repository.get_user_by_username(db, user_data.username)

        if username_user.is_active == False:
            return None, "User is not active"

        if username_user:
            if username_user.is_active == True:
                return None, "Username already taken"
            # ถ้ายัง pending ให้เช็คว่าอีเมลตรงกันไหม
            if username_user.email != user_data.email:
                return None, "Username already taken with different email"

        # 2) ตรวจ email
        email_user = user_repository.get_user_by_email(db, user_data.email)
        if email_user:
            if email_user.is_active == True:
                return None, "Email already registered"
            # ถ้า pending ให้ reuse account เดิม
            target_user = email_user
        else:
            # ถ้าไม่มี user นี้เลย → สร้างใหม่
            
            user_data.password = hash_password(user_data.password)

            target_user = user_repository.create_user(
                db, {**user_data.dict(), "is_active": True}
            )
            db.flush()

        # 3) เช็คว่า OTP เก่ายังไม่หมดอายุหรือไม่
        # existing_otp = otp_repository.get_latest_by_user_purpose(
        #     db=db,
        #     user_id=target_user.user_id,
        #     purpose="register"
        # )

        # if existing_otp and existing_otp.expires_at > now_utc():
        #     remaining_sec = int((existing_otp.expires_at - now_utc()).total_seconds())
        #     return None, f"Please wait {remaining_sec} seconds before requesting a new OTP"

        # 3) สร้าง/อัปเดต OTP
        # otp_code = generate_numeric_otp(6)
        # expires_at = now_utc() + timedelta(minutes=OTP_EXPIRE_MINUTES)

        # new_otp = otp_repository.create_otp(
        #     db=db,
        #     user_id=target_user.user_id,
        #     otp_code=hash_otp(otp_code),
        #     purpose="register",
        #     expires_at=expires_at
        # )

        # otp_token = create_otp_token({
        #     "user_id": str(target_user.user_id),
        #     "otp_id": str(new_otp.otp_id),
        #     "purpose": "register",
        #     "exp": int(expires_at.timestamp())
        # })

        # send_meta = send_register_otp_notification(target_user, otp_code)

        # TODO: ส่ง Email/SMS OTP
        db.commit()

        return {
            "message": "Registration Successful",
            "username": target_user.username
            # "otp_token": otp_token,
            # "otp_code": otp_code,
            # "send_meta": send_meta
        }, None

    except Exception as e:
        db.rollback()
        return None, str(e)
    

def login_service(db: Session,  payload):
    try:
        identity = payload.identity
        password = payload.password

        print(f"service login identity: {identity}, password: {password}")

        user = user_repository.get_by_identity(db, identity)
        
        print(f"password from db: {user.password}")

        print(f"service get user: {user.username} {user.user_id}")


        if not user:
            return None, "User not found"

        if not verify_password(password, user.password):
            return None, "Invalid password"
        
        print(f"service user role: {user.role.role_name}")

        # สร้าง access token
        access_token = create_access_token(
            data={"sub": str(user.user_id), "username": user.username, "user_role": user.role.role_name}
        )

        print(f"user is active in service: {user.is_active}")
        user.is_active = True
        print(f"user is active ture in service: {user.is_active}")

        print(f"service access_token: {access_token}")
        

        db.commit()
        db.refresh(user)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "username": user.username
        }, None

    except Exception as e:
        return None, str(e)


# def resend_register_otp_service(db: Session, identity):  # identity = username หรือ email
#     """ตัวอย่างแยกฟังก์ชันขอ OTP ใหม่ โดยมี rate limit"""
#     try:
#         user = user_repository.get_by_identity(db, identity)
#         if not user:
#             return None, "User not found"
#         if user.is_active or user.status == "active":
#             return None, "User is already active"

#         # ตรวจ rate limit + ถ้า OTP เดิมยังไม่หมดอายุ ให้รอ
#         current_otp = otp_repository.get_latest_by_user_purpose(db, user.user_id, "register")
#         now = now_utc()
#         if current_otp and current_otp.expires_at and current_otp.expires_at > now:
#             remaining_sec = int((current_otp.expires_at - now_utc()).total_seconds())
#             return None, f"Please wait {remaining_sec} seconds before requesting a new OTP"
#         otp_repository.ensure_can_request(db, user.user_id, purpose="register")  # เช็คจำนวนครั้ง/ช่วงเวลา

#         # อัปเดต/สร้าง OTP ใหม่
#         otp_code = generate_numeric_otp(6)
#         expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)
#         if current_otp:
#             otp_repository.update_otp(db, current_otp.otp_id,
#                                       otp_code=hash_otp(otp_code),
#                                       expires_at=expires_at,
#                                       verified_at=None)
#             otp_id = current_otp.otp_id
#         else:
#             new_otp = otp_repository.create_otp(db, user.user_id, hash_otp(otp_code), "register", expires_at)
#             otp_id = new_otp.otp_id

#         otp_token = create_otp_token({
#             "user_id": str(user.user_id),
#             "otp_id": str(otp_id),
#             "purpose": "register",
#             "exp": int(expires_at.timestamp())
#         })

#         # send_meta = send_register_otp_notification(user, otp_code)

#         # ส่ง OTP ภายนอกที่นี่
#         db.commit()

#         res = {
#                 "message": "OTP re-sent", 
#                 "otp_token": otp_token, 
#                 "otp_code": otp_code, }
#                 # "send_meta": send_meta }  # debug เท่านั้น}
#         return res, None

    # except Exception as e:
    #     db.rollback()
    #     return None, str(e)


# def register_verify_otp_service(db: Session, data):
#     try:
#         payload = decode_otp_token(data.otp_token)
#         if not payload or payload.get("purpose") != "register":
#             return None, "Invalid or expired OTP token"

#         user_id = payload.get("user_id")
#         otp_id = payload.get("otp_id")
#         if not user_id or not otp_id:
#             return None, "Invalid token payload"

#         # ดึง OTP แบบ lock แถว (ถ้ารองรับ) แล้วตรวจครบทุกเงื่อนไข
#         otp_row = otp_repository.get_otp_by_id_for_update(db, otp_id)  # หรือ get_latest_by_user_purpose
#         if not otp_row or str(otp_row.user_id) != str(user_id):
#             return None, "Invalid OTP"

#         now = now_utc()
#         if otp_row.verified_at:
#             return None, "OTP already used"
#         if not otp_row.expires_at or otp_row.expires_at < now:
#             return None, "OTP is expired"

#         # ตรวจ OTP code (hash เทียบ)
#         if not verify_otp_hash(data.otp_code, otp_row.otp_code):
#             otp_repository.bump_failed_attempt(db, otp_row.otp_id)
#             return None, "Invalid OTP"

#         # สำเร็จ → active user + mark verified + ลบ OTP อื่น
#         user = user_repository.get_user_by_user_id(db, user_id)
#         if not user:
#             return None, "User not found"

#         user.is_active = True
#         user.status = "active"

#         otp_row.verified_at = now
#         otp_row.is_delete = True
#         otp_repository.delete_others_by_user_purpose(db, user_id, "register", keep_id=otp_row.otp_id)

        

#         db.commit()
#         return {"message": "User registered successfully", "username": user.username}, None

#     except Exception as e:
#         db.rollback()
#         return None, str(e)
