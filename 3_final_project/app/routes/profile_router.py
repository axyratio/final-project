from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.profile import ChangePasswordRequest, DeleteProfile, ResponseChangeProfile, ChangeProfile, ResponseDeleteProfile, ResponseMyProfile  # สะกดชื่อไฟล์ให้ถูกเป็น profile ถ้าพิมพ์ผิด
from app.services import profile_service
from app.core.authz import authenticate_token

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get(
    "/me",
    response_model=ResponseMyProfile,

)
def getProfile(
    auth_current_user: str = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    print("token", auth_current_user)
    myProfile, error = profile_service.my_profile_user_service(db, auth_current_user)
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return myProfile

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
    print(error)
    if error:
        
        raise HTTPException(status_code=400, detail=error)
    
    if profileRes is None:
        # ไม่มีข้อมูลเปลี่ยนแปลง → return 204
        return JSONResponse(content={"message": "No content", "success": True, "updated": None, }, status_code=200)
    
    
    
    return {"message": "change profile successfully", "updated": profileRes, "success": True} # ฝากแก้ที schema
@router.patch(
    "/delete",
    response_model=ResponseDeleteProfile
)
def deleteProfile(
    data: DeleteProfile,
    auth_current_user: str = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    print("user_id in delete router", auth_current_user.user_id)

    deleteRes, error = profile_service.delete_profile_user_service(
        db, auth_current_user, data.password
    )

    if error:
        if isinstance(error, dict):
            return JSONResponse(status_code=200, content=error)
        raise HTTPException(status_code=400, detail=error)
    
    print("deleteRes in router", deleteRes)

    # ✅ return ให้ตรง schema
    return {
        "success": True,
        "message": "Profile deleted successfully"
    }


@router.patch("/password-change")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user = Depends(authenticate_token())
):
    result, error = profile_service.change_password_service(
        db=db,
        auth_current_user=current_user,
        old_password=request.old_password,
        new_password=request.new_password
    )
    if error:
        return JSONResponse(status_code=200, content=error)
    return result





