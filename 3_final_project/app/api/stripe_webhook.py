# app/api/stripe_webhook.py
from uuid import UUID
import stripe
from fastapi import APIRouter, Header, HTTPException, Request, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.config import settings
from app.models.payment import Payment, PaymentStatus
from app.models.order import Order
from app.models.stripe_event import StripeEvent
from app.utils.now_utc import now_utc

router = APIRouter(prefix="/stripe", tags=["Stripe"])


def _already_processed(db: Session, event_id: str) -> bool:
    return db.query(StripeEvent).filter(StripeEvent.event_id == event_id).first() is not None


def _mark_processed(db: Session, event_id: str, event_type: str) -> None:
    db.add(StripeEvent(event_id=event_id, event_type=event_type))
    db.commit()


def _update_orders_paid(db: Session, payment_id: UUID) -> None:
    orders = db.query(Order).filter(Order.payment_id == payment_id).all()
    for o in orders:
        # ✅ ต่อให้เคย CANCELLED ก็ revive เป็น PAID ได้ (ถ้าธุรกิจมึงยอมรับ)
        o.order_status = "PAID"
        o.order_text_status = "ชำระเงินแล้ว"
    db.commit()


def _update_orders_failed(db: Session, payment_id: UUID, reason_text: str) -> None:
    orders = db.query(Order).filter(Order.payment_id == payment_id).all()
    for o in orders:
        if o.order_status != "PAID":  # กันไม่ให้ทับของที่ paid แล้ว
            o.order_status = "CANCELLED"
            o.order_text_status = reason_text
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
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

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
            # completed บางเคสอาจยังไม่ paid ถ้าเป็น delayed method
            if event_type == "checkout.session.completed" and session.get("payment_status") != "paid":
                _mark_processed(db, event_id, event_type)
                return {"received": True}

            if payment.status != PaymentStatus.SUCCESS:
                payment.status = PaymentStatus.SUCCESS
                payment.paid_at = now_utc()
                if session.get("payment_intent"):
                    payment.payment_intent_id = session["payment_intent"]
                db.commit()

            _update_orders_paid(db, payment_id)
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
