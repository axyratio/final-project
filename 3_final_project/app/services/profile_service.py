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
            return None, "No data to update"

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
    
def delete_profile_user_service(db: Session, auth_current_user):
    try:
        print(f"current user in service: {auth_current_user.user_id}")
        delete_user = profile_repository.delete_user(
            db=db,
            user_id=auth_current_user.user_id
        )

        if not delete_user:
            return None, "User not found"

        db.commit()
        db.refresh(delete_user)

        return delete_user, None

    except Exception as e:
        db.rollback()
        return None, str(e)