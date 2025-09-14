from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.profile import ResponseChangeProfile, ChangeProfile, ResponseDeleteProfile  # สะกดชื่อไฟล์ให้ถูกเป็น profile ถ้าพิมพ์ผิด
from app.services import profile_service
from app.core.authz import authenticate_token

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.patch(
    "/change",
    response_model=ResponseChangeProfile,
    summary="Change User Profile",
)
def changeProfile(
    data: ChangeProfile,
    auth_current_user: str = Depends(authenticate_token()),  # ใช้เพื่อยืนยันตัวตนผู้ใช้
    db: Session = Depends(get_db)
):  
    profileRes, error = profile_service.update_profile_user_service(db, auth_current_user, data)
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return profileRes # ฝากแก้ที schema

@router.patch(
    "/delete",
    response_model=ResponseDeleteProfile
)
def deleteProfile(
    auth_current_user: str = Depends(authenticate_token()),  # ใช้เพื่อยืนยันตัวตนผู้ใช้
    db: Session = Depends(get_db)
):
    
    print("user_id in delete router", auth_current_user.user_id)
    deleteRes, error = profile_service.delete_profile_user_service(db, auth_current_user)
    if error:
        raise HTTPException(status_code=400, detail=error)
    print("deleteRes in router", deleteRes)
    return { "message": "Profile deleted successfully" }







