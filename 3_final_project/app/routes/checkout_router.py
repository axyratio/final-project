# app/api/checkout.py
from duckdb import HTTPException
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.schemas.checkout import CheckoutRequest, CheckoutResponse
from app.services.checkout_service import CheckoutService
from app.core.authz import authenticate_token
from app.models.user import User
from app.utils.response_handler import success_response

from app.models.order import Order
from app.models.payment import Payment, PaymentStatus
from app.models.stock_reservation import StockReservation
from app.models.user import User

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

@router.post("/checkout/cancel/{order_id}")
def cancel_reservation(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    ยกเลิก reservation เมื่อ user ออกจากหน้าชำระเงินก่อนเวลาหมด
    """
    order = db.query(Order).filter(
        Order.order_id == order_id,
        Order.user_id == current_user.user_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.order_status != "PENDING":
        return success_response("Order already processed", {"status": order.order_status})
    
    order.order_status = "CANCELLED"
    order.order_text_status = "ยกเลิกโดยผู้ใช้"
    
    db.query(StockReservation).filter(
        StockReservation.order_id == order_id
    ).delete(synchronize_session=False)
    
    if order.payment_id:
        payment = db.query(Payment).filter(
            Payment.payment_id == order.payment_id
        ).first()
        if payment and payment.status == PaymentStatus.PENDING:
            payment.status = PaymentStatus.FAILED
    
    db.commit()
    
    return success_response("ยกเลิกการจองสำเร็จ", {"order_id": str(order_id)})