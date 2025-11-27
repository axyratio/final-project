# app/services/auth_service.py
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.repositories import user_repository, profile_repository
from app.core.security import verify_password
from app.core.config import settings
# from app.utils.generate_numeric_otp import generate_numeric_otp
from app.utils.now_utc import now_utc
from app.schemas.user import UserLogin
from app.schemas.auth import Authorize

def update_profile_user_service(db: Session, auth_current_user, data):
    try:
        get_user = user_repository.get_user_by_user_id(db=db, user_id=auth_current_user.user_id)

        print(f"duplicate get_user, data: {get_user.first_name}, {data.first_name}")

        print(f"current user in service: {auth_current_user.user_id}")
        print("lastname in service", get_user.last_name)
        update_data = {}

        if data.first_name is not None and data.first_name != get_user.first_name: update_data["first_name"] = data.first_name
        if data.last_name  is not None and data.last_name != get_user.last_name: update_data["last_name"]  = data.last_name
        if data.username   is not None and data.username != get_user.username: update_data["username"]   = data.username
        if data.birth_date is not None and data.birth_date != get_user.birth_date: update_data["birth_date"] = data.birth_date

        print(f"type of birth date in service {data.birth_date} {get_user.birth_date}")

        print("dict in service test",update_data)
        if not update_data:
            return None, None

        changeUser = profile_repository.update_user(
            db=db,
            user_id=auth_current_user.user_id,
            update_data=update_data
        )

        print(f"changeUser in service: {changeUser.user_id}")

        if not changeUser:
            return None, "User not found"

        print("commit start")
        db.commit()
        print("commit complete")
        db.refresh(changeUser)

        return update_data, None

    except Exception as e:
        db.rollback()
        return None, str(e)
def delete_profile_user_service(db: Session, auth_current_user, password):
    try:
        print(f"current user in service: {auth_current_user.user_id}")

        # ดึง user ขึ้นมาก่อน
        user = user_repository.get_user_by_user_id(db, auth_current_user.user_id)

        if not user:
            return None, "User not found"
        
        # ตรวจสอบรหัสผ่านก่อน
        if not verify_password(password, user.password):
            return None, { "password": "รหัสผ่านไม่ถูกต้อง", "success": False }

        # ลบ user หลังจากรหัสผ่านถูกต้อง
        profile_repository.delete_user(db=db, user_id=auth_current_user.user_id)

        db.commit()

        return {"deleted_user_id": auth_current_user.user_id}, None

    except Exception as e:
        db.rollback()
        return None, str(e)

    
def my_profile_user_service(db: Session, auth_current_user):
    try:
        my_profile = profile_repository.get_my_profile(
            db=db,
            user_id=auth_current_user.user_id
        )

        if my_profile is None:
            return None, { "message": "ไม่มีพบโปรไฟล์" }
        
        return my_profile, None
    
    except Exception as e:
        db.rollback()
        return None, str(e)
    
def change_password_service(db: Session, auth_current_user, old_password: str, new_password: str):
    try:
        # ดึง user
        user = user_repository.get_user_by_user_id(db=db, user_id=auth_current_user.user_id)
        if not user:
            return None, "User not found"

        # ตรวจสอบรหัสผ่านเก่า
        if not verify_password(old_password, user.password):
            return None, {"password": "รหัสผ่านเก่าไม่ถูกต้อง", "success": False}

        # เปลี่ยนรหัสผ่าน
        updated_user = profile_repository.change_user_password(
            db=db,
            user_id=auth_current_user.user_id,
            new_password=new_password
        )
        if not updated_user:
            return None, "User not found"

        db.commit()
        db.refresh(updated_user)
        return {"message": "เปลี่ยนรหัสผ่านสำเร็จ", "success": True }, None
    except Exception as e:
        db.rollback()
        return None, str(e)