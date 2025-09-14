
from fastapi import APIRouter, HTTPException
import stripe
from app.schemas.bank import BankAccountCheck
from app.services.bank_service import check_bank_connected_account

router = APIRouter(tags=["accounts"])

@router.post("/check-account")
def check_bank_account(bank: BankAccountCheck):
    try:
        # 1) สร้าง token ของ bank account (Stripe จะ validate ข้อมูลเบื้องต้น)
        bank = check_bank_connected_account(bank)
        return {
        "status": "valid",
        "bank_account_id": bank["bank_account"]["id"],
        "last4": bank["bank_account"]["last4"],
        "bank_name": bank["bank_account"]["bank_name"],  # บางเคสอาจเป็น None ถ้า test data
        "country": bank["bank_account"]["country"],
    }
        

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
