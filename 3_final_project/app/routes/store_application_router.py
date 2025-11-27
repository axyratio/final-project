from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.store_application import RequestStoreApplication, ResponseStoreApplication, UpdateStoreApplication, ResponseUpdateStoreApplication
from app.services import store_application_service
from app.core.authz import authenticate_token, authorize_role
from app.core.citizen_verified import citizen_verified
from app.utils.response_handler import error_response

router = APIRouter(prefix="/store", tags=["Store"])

@router.post(
    "/application",
    response_model=ResponseStoreApplication
)
def request_store_application(
    data: RequestStoreApplication,
    auth_current_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["user"])),
    db: Session = Depends(get_db)
):
    try:
        # ✅ ตรวจสอบข้อมูลบัตรประชาชน
        card_verified = citizen_verified(data.card_id, data.first_name, data.last_name, data.birth_date)

        # ✅ เรียก service (service จะ return JSONResponse อยู่แล้ว)
        return store_application_service.store_application_service(db, auth_current_user, data, card_verified)

    except Exception as e:
        return error_response(
            "เกิดข้อผิดพลาดขณะสมัครร้านค้า",
            {"error": str(e)},
            status_code=500
        )


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



