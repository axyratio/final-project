from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.store_application import RequestStoreApplication, ResponseStoreApplication, UpdateStoreApplication, ResponseUpdateStoreApplication
from app.services import store_application_service
from app.core.authz import authenticate_token, authorize_role
from app.core.citizen_verified import citizen_verified

router = APIRouter(prefix="/store", tags=["Store"])

@router.post(
    "/application",
    response_model=ResponseStoreApplication
)
def requestStoreApplication(
    data: RequestStoreApplication,
    auth_current_user: str = Depends(authenticate_token()),  # ใช้เพื่อยืนยันตัวตนผู้ใช้
    auth_role: str = Depends(authorize_role(["user"])),  # ใช้เพื่อยืนยันตัวตนผู้ใช้
    db: Session = Depends(get_db)
):  
    try:
        card_verified = citizen_verified(data.card_id, data.first_name, data.last_name, data.birth_date)
        print(f'first name {data.first_name}')
        requestStoreApplicationRes, error = store_application_service.request_store_application_service(db, auth_current_user, data, card_verified)
        if error:
            raise HTTPException(status_code=400, detail=error)
        
        return ResponseStoreApplication(
            message="Request store application successfully"
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ไม่ต้องทำถ้าหากมีระบบเช็คบัญชีธนาคารแล้ว 
# def approvedStoreApplication(
#     data: UpdateStoreApplication,
#     auth_current_user: str = Depends(authenticate_token()),  # ใช้เพื่อยืนยันตัวตนผู้ใช้
#     auth_role: str = Depends(authorize_role(["admin"])),  # ใช้เพื่อยืนยันตัวตนผู้ใช้
#     db: Session = Depends(get_db)
# ):
#     try:
#         approvedStoreApplicationRes, error = store_application_service.approved_store_application_service(db, auth_current_user, data)
#         if error:
#             raise HTTPException(status_code=400, detail=error)
        
#         return ResponseUpdateStoreApplication(
#             message="Approved store application successfully"
#         )

#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))



