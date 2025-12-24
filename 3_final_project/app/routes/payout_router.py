# app/routes/payout_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.services.payout_service import PayoutService
from app.utils.response_handler import success_response

router = APIRouter(prefix="/orders", tags=["Payout"])

@router.post("/{order_id}/confirm-delivery")
def confirm_delivery_and_payout(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    payout = PayoutService.payout_order_to_store(db, order_id, current_user.user_id)

    return success_response(
        "ยืนยันรับสินค้าและโอนเงินให้ร้านสำเร็จ",
        {
            "payout_id": str(payout.payout_id),
            "order_id": str(payout.order_id),
            "store_id": str(payout.store_id),
            "amount": payout.amount,
            "platform_fee": payout.platform_fee,
            "stripe_transfer_id": payout.stripe_transfer_id,
        }
    )
