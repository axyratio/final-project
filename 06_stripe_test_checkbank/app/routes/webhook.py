from fastapi import APIRouter, Request, HTTPException
import stripe
from app.core.config import STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET

router = APIRouter()
stripe.api_key = STRIPE_API_KEY

@router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig, secret=STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ตัวอย่างเหตุการณ์ที่นิยมใช้
    if event["type"] == "payment_intent.succeeded":
        pi = event["data"]["object"]
        # TODO: update สถานะออเดอร์ของคุณเป็น paid ด้วย pi["id"] / pi["metadata"]["order_id"]
    elif event["type"] == "payment_intent.payment_failed":
        pi = event["data"]["object"]
        # TODO: mark failed + แจ้งลูกค้า
    # เพิ่มประเภทอื่น ๆ ตามต้องการ

    return {"received": True}
