from fastapi import APIRouter, HTTPException, Query
from app.services.payments_service import create_test_charge

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/topup")
def topup(amount: int = Query(..., ge=1), currency: str = "usd"):
    try:
        return create_test_charge(amount=amount, currency=currency)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
