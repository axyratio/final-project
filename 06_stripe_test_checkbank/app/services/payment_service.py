import stripe
from app.core.config import STRIPE_API_KEY

stripe.api_key = STRIPE_API_KEY

def create_payment_intent(payload):
    # แนบข้อมูลสั่งซื้อใน metadata เพื่อกระทบยอดย้อนกลับในระบบของคุณ
    metadata = {}
    if payload.order_id:
        metadata["order_id"] = payload.order_id

    pi = stripe.PaymentIntent.create(
        amount=payload.amount,
        currency=payload.currency,
        payment_method_types=payload.payment_method_types,
        description=payload.description,
        receipt_email=payload.customer_email,
        metadata=metadata
    )
    return pi

def retrieve_payment_intent(payment_intent_id: str):
    return stripe.PaymentIntent.retrieve(payment_intent_id)
