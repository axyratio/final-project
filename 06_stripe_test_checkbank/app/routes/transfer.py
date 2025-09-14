from fastapi import APIRouter, HTTPException
from app.schemas.transfer import CreateTransferIn
from app.services.transfer_service import create_transfer

router = APIRouter()

@router.post("", summary="โอนจากแพลตฟอร์มไปผู้ขาย (Transfer)")
def create_transfer_route(body: CreateTransferIn):
    try:
        tr = create_transfer(body)
        return {"transfer_id": tr["id"], "status": tr["status"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
