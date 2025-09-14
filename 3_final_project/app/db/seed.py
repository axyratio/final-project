from sqlalchemy.orm import Session
from app.models.role import Role

DEFAULT_ROLES = ["user", "seller", "admin", "administrator"]

def seed_roles(db: Session):
    for role_name in DEFAULT_ROLES:
        existing = db.query(Role).filter(Role.role_name == role_name).first()
        if not existing:
            db.add(Role(role_name=role_name))
            db.add(Role(is_active=True))  # Ensure the role is active
    db.commit()
