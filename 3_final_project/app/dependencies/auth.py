from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import settings
from fastapi import Request

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Dependency: get DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_from_cookie(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    

def authorize_role(required_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user_from_cookie)):
        user_role_name = current_user.role.role_name  # ใช้ .role จาก relationship
        if user_role_name not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: require role {required_roles}, but you are '{user_role_name}'"
            )
        return current_user  # ส่ง current_user กลับไปใช้ต่อ
    return role_checker

