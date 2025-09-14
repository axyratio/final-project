# app/core/authz.py
from typing import Optional, Sequence, Callable
from fastapi import Depends, HTTPException, status, Response, Request
from jose import JWTError, jwt
from app.core.config import settings
from app.db.database import get_db
from sqlalchemy.orm import Session
from app.models.user import User

def get_current_user_from_cookie(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    token = request.cookies.get("access_token")
    print(f"token in authz====================: {token}")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # กันกรณีคุกกี้เก็บเป็น "Bearer <token>"
    if token.startswith("Bearer "):
        token = token[len("Bearer "):]

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        print(payload)
        user_id: Optional[str] = payload.get("sub")
        print("user_id sub in auth:", user_id)
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        user = db.query(User).filter(User.user_id == user_id).first()

        if user.is_active == False:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")

        print(f"show user in authz: {user.user_id}")
        if not user.user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        print(f"show user all model from authz:{user.user_id, user.username, user.email, user.role.role_name, user.is_active}")
        return user
    
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def authenticate_token() -> Callable:
    def checker(current_user: User = Depends(get_current_user_from_cookie)):
        print(f"authenticat otken {current_user}")
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        return current_user
    return checker


def authorize_role(required_roles: Sequence[str]) -> Callable:
    def checker(current_user: User = Depends(get_current_user_from_cookie)):
        user_role = getattr(getattr(current_user, "role", None), "role_name", None)
        if user_role is None or user_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this resource",
            )
        return current_user
    return checker


def set_auth_cookies(response: Response, access_token: str, refresh_token: str | None = None, *, cross_site: bool = False):
    """
    cross_site=True  -> ต้องการข้ามโดเมน: ใช้ HTTPS + SameSite=None + Secure=True
    cross_site=False -> same-site ปกติสำหรับ dev
    """
    if cross_site:
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=1800,
            path="/",
        )
        if refresh_token:
            response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=True,
                samesite="none",
                max_age=60*60*24*7,
                path="/auth/refresh",
            )
    else:
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=1800,
            path="/",
        )
        if refresh_token:
            response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=60*60*24*7,
                path="/auth/refresh",
            )
