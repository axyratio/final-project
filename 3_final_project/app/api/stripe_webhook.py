# app/api/stripe_webhook.py
from uuid import UUID
from fastapi.responses import JSONResponse
import stripe
from fastapi import APIRouter, Header, Request, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.config import settings
from app.models.payment import Payment, PaymentStatus
from app.models.order import Order
from app.models.stripe_event import StripeEvent
from app.repositories import cart_repository
from app.services.stock_service import commit_stock_for_order
from app.utils.now_utc import now_utc

router = APIRouter(prefix="/stripe", tags=["Stripe"])

# ✅ อ้างอิงตาม enum ฝั่ง client ที่ให้มา
# - หลังชำระเงินสำเร็จ => PREPARING (ไม่ใช้ PAID เป็นสถานะหลักแล้ว)
# - กัน event fail/expired มาทับออเดอร์ที่เลยจุดชำระเงิน/ดำเนินการไปแล้ว
POST_PAYMENT_ORDER_STATUSES = {
    "PAID",        # legacy เผื่อ DB มีของเก่า
    "PREPARING",
    "SHIPPED",
    "DELIVERED",
    "COMPLETED",
    "RETURNING",
    "RETURNED",
}


def _already_processed(db: Session, event_id: str) -> bool:
    return (
        db.query(StripeEvent)
        .filter(StripeEvent.event_id == event_id)
        .first()
        is not None
    )


def _clear_purchased_cart_items(db: Session, payment: Payment) -> None:
    if not payment.selected_cart_item_ids:
        return
    ids = [UUID(x) for x in payment.selected_cart_item_ids]
    cart_repository.delete_cart_items(db, payment.user_id, ids)
    db.commit()


def _mark_processed(db: Session, event_id: str, event_type: str) -> None:
    db.add(StripeEvent(event_id=event_id, event_type=event_type))
    db.commit()


def _update_orders_paid(db: Session, payment_id: UUID) -> None:
    """
    ✅ เมื่อชำระเงินสำเร็จ -> ให้ Order ไปเป็น PREPARING
    (แทน PAID ตาม requirement ใหม่)
    """
    print("Updating orders to PREPARING for payment_id:", payment_id, flush=True)

    orders = db.query(Order).filter(Order.payment_id == payment_id).all()
    for o in orders:
        # ถ้าออเดอร์ไปไกลกว่าเตรียมแล้ว อย่า downgrade
        if o.order_status in {"SHIPPED", "DELIVERED", "COMPLETED", "RETURNING", "RETURNED"}:
            continue

        # migrate legacy PAID -> PREPARING + revive CANCELLED (ถ้าธุรกิจมึงยอมรับ)
        o.order_status = "PREPARING"
        o.order_text_status = "กำลังเตรียมสินค้า"

    db.commit()


def _update_orders_failed(db: Session, payment_id: UUID, reason_text: str) -> None:
    """
    ✅ failed/expired ไม่ควรมาทับออเดอร์ที่เลยจุดชำระเงิน/กำลังดำเนินการแล้ว
    """
    orders = db.query(Order).filter(Order.payment_id == payment_id).all()
    for o in orders:
        # กันไม่ให้ทับสถานะที่ผ่านจุดชำระเงินแล้ว
        if o.order_status in POST_PAYMENT_ORDER_STATUSES:
            continue

        o.order_status = "CANCELLED"
        o.order_text_status = reason_text

    db.commit()


def _commit_stock_for_payment_orders(db: Session, payment_id: UUID) -> None:
    orders = db.query(Order).filter(Order.payment_id == payment_id).all()
    for o in orders:
        commit_stock_for_order(db, o.order_id)
    db.commit()


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
):
    print("=== WEBHOOK HIT ===", flush=True)
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
        print("verified event:", event.get("type"), event.get("id"), flush=True)
    except Exception as e:
        print(f"❌ Error processing webhook: {e}", flush=True)
        return JSONResponse(content={"error": str(e)}, status_code=400)

    event_id = event.get("id")
    event_type = event.get("type")
    if not event_id or not event_type:
        return {"received": True}

    if _already_processed(db, event_id):
        return {"received": True}

    # ---- handle checkout session events ----
    if event_type in (
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired",
    ):
        session = event["data"]["object"]
        metadata = session.get("metadata") or {}
        app_payment_id = metadata.get("app_payment_id")

        print("app_payment_id:", app_payment_id, flush=True)

        if not app_payment_id:
            _mark_processed(db, event_id, event_type)
            return {"received": True}

        try:
            payment_id = UUID(app_payment_id)
        except Exception:
            _mark_processed(db, event_id, event_type)
            return {"received": True}

        payment = db.query(Payment).filter(Payment.payment_id == payment_id).first()
        if not payment:
            _mark_processed(db, event_id, event_type)
            return {"received": True}

        # ✅ SUCCESS
        if event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
            # checkout.session.completed อาจมาแบบยังไม่ paid ได้
            if event_type == "checkout.session.completed" and session.get("payment_status") != "paid":
                _mark_processed(db, event_id, event_type)
                return {"received": True}

            # ✅ ถ้า orders ถูก CANCELLED ไปแล้วทั้งหมด -> refund และไม่ revive
            orders = db.query(Order).filter(Order.payment_id == payment_id).all()

            if orders and all(o.order_status == "CANCELLED" for o in orders):
                print("⚠️ Order already CANCELLED. Refunding payment...", flush=True)

                if session.get("payment_intent"):
                    try:
                        stripe.Refund.create(payment_intent=session["payment_intent"])
                        payment.status = PaymentStatus.REFUNDED
                        db.commit()
                    except Exception as e:
                        print(f"❌ Refund failed: {e}", flush=True)

                _mark_processed(db, event_id, event_type)
                return {"received": True}

            # update payment record
            if payment.status != PaymentStatus.SUCCESS:
                payment.status = PaymentStatus.SUCCESS
                payment.paid_at = now_utc()
                if session.get("payment_intent"):
                    payment.payment_intent_id = session["payment_intent"]
                db.commit()

            # ✅ เปลี่ยนจาก PAID -> PREPARING
            _update_orders_paid(db, payment_id)

            # commit stock + clear cart
            _commit_stock_for_payment_orders(db, payment_id)
            _clear_purchased_cart_items(db, payment)

            _mark_processed(db, event_id, event_type)
            return {"received": True}

        # ✅ FAILED
        if event_type == "checkout.session.async_payment_failed":
            if payment.status not in (PaymentStatus.SUCCESS, PaymentStatus.FAILED):
                payment.status = PaymentStatus.FAILED
                db.commit()
            _update_orders_failed(db, payment_id, "ชำระเงินไม่สำเร็จ")
            _mark_processed(db, event_id, event_type)
            return {"received": True}

        # ✅ EXPIRED
        if event_type == "checkout.session.expired":
            if payment.status != PaymentStatus.SUCCESS:
                payment.status = PaymentStatus.FAILED
                db.commit()
                _update_orders_failed(db, payment_id, "หมดเวลาชำระเงิน")
            _mark_processed(db, event_id, event_type)
            return {"received": True}

    # ---- fallback payment_intent failed ----
    if event_type == "payment_intent.payment_failed":
        pi = event["data"]["object"]
        metadata = pi.get("metadata") or {}
        app_payment_id = metadata.get("app_payment_id")

        if app_payment_id:
            try:
                payment_id = UUID(app_payment_id)
            except Exception:
                _mark_processed(db, event_id, event_type)
                return {"received": True}

            payment = db.query(Payment).filter(Payment.payment_id == payment_id).first()
            if payment and payment.status != PaymentStatus.SUCCESS:
                payment.status = PaymentStatus.FAILED
                db.commit()
                _update_orders_failed(db, payment_id, "ชำระเงินไม่สำเร็จ")

        _mark_processed(db, event_id, event_type)
        return {"received": True}

    _mark_processed(db, event_id, event_type)
    return {"received": True}
