# app/api/stripe_webhook.py
import stripe
from fastapi import APIRouter, Header, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.config import settings
from app.models.payment import Payment, PaymentStatus
from app.utils.now_utc import now_utc

router = APIRouter(prefix="/stripe", tags=["Stripe"])

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: str = Header(None, alias="Stripe-Signature")
):
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # จัดการบาง event หลัก ๆ พอ
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        app_payment_id = (session.get("metadata") or {}).get("app_payment_id")
        if not app_payment_id:
            return {"received": True}

        payment = db.query(Payment).filter(Payment.payment_id == app_payment_id).first()
        if payment and payment.status != PaymentStatus.SUCCESS:
            payment.status = PaymentStatus.SUCCESS
            payment.paid_at = now_utc()

            # ตอนนี้แหละค่อยได้ payment_intent (หลังจ่ายสำเร็จ)
            if session.get("payment_intent"):
                payment.payment_intent_id = session["payment_intent"]

            db.commit()


    elif event["type"] == "payment_intent.payment_failed":
        pi = event["data"]["object"]
        payment_intent_id = pi["id"]

        payment = (
            db.query(Payment)
            .filter(Payment.payment_intent_id == payment_intent_id)
            .first()
        )
        if payment:
            payment.status = PaymentStatus.FAILED
            db.commit()

    # ไม่ต้องตอบอะไรเยอะ
    return {"received": True}
