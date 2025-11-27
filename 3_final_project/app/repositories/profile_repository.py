from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories.user_repository import get_user_by_user_id
from app.core.security import hash_password


def get_my_profile(db: Session, user_id):
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        return None
    
    return user

def change_user_password(db: Session, user_id: int, new_password: str) -> User | None:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    user.password = hash_password(new_password)
    db.add(user)
    return user

def update_user(db: Session, user_id: str, update_data):
    print(f"repo update user: {update_data}")
    user = db.query(User).filter(User.user_id == user_id).first()
    print(f"user after queryin repo", user.user_id)
    if not user:
        return None

    changed = False
    if update_data.get("first_name") is not None and update_data["first_name"] != user.first_name:
        user.first_name = update_data["first_name"]
        changed = True
    if update_data.get("last_name") is not None and update_data["last_name"] != user.last_name:
        user.last_name = update_data["last_name"]
        changed = True
    if update_data.get("username") is not None and update_data["username"] != user.username:
        user.username = update_data["username"]
        changed = True
    if update_data.get("birth_date") is not None and update_data["birth_date"] != user.birth_date:
        user.birth_date = update_data["birth_date"]
        changed = True

    db.flush()

    if not changed:
        return user  # ไม่ commit ถ้าไม่มีการเปลี่ยน
    print(f"first_name after update in repo {user.first_name}")
    print("no commit")
    db.refresh(user)
    print("refresh")
    return user

def delete_user(db: Session, user_id: str):
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return None
        
        user.is_active = False
        db.flush()

        return user  # คืน instance ที่ยังเป็น mapped class
    except:
        db.rollback()
        raise