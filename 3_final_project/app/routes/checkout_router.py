# app/api/checkout.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.checkout import CheckoutRequest, CheckoutResponse
from app.services.checkout_service import CheckoutService
from app.core.authz import authenticate_token
from app.models.user import User
from app.utils.response_handler import success_response

router = APIRouter(
    prefix="/api/v1",
    tags=["Checkout"],
)


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    result = CheckoutService.checkout(db, current_user, payload)
    return success_response("สร้างคำสั่งซื้อและ Stripe session สำเร็จ", result, status_code=201)
