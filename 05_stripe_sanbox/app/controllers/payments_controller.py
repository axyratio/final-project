from fastapi import APIRouter
from app.services.payments_service import create_test_charge

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/topup")
def topup(amount: int, currency: str = "usd"):
    return create_test_charge(amount=amount, currency=currency)
