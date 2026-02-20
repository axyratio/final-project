# app/services/stripe_webhook_service.py
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.stripe_client import stripe


from app.models.order import Order
from app.models.payment import Payment, PaymentStatus
from app.models.stock_reservation import StockReservation
from app.models.product import ProductVariant
from app.models.cart import Cart, CartItem
from app.utils.now_utc import now_utc


class StripeWebhookService:

    @staticmethod
    def handle_checkout_session_completed(db: Session, event):
        session = event["data"]["object"]

        metadata = session.get("metadata", {}) or {}

        # รองรับทั้ง order_ids (multi) และ fallback ไปใช้ order_id เดียว
        order_ids_raw = metadata.get("order_ids") or metadata.get("order_id")
        is_from_cart = metadata.get("is_from_cart") == "true"
        user_id = metadata.get("user_id")
        cart_id = metadata.get("cart_id")

        if not order_ids_raw:
            raise HTTPException(status_code=400, detail="order_ids ไม่อยู่ใน Stripe metadata")

        if "," in order_ids_raw:
            order_ids = [oid.strip() for oid in order_ids_raw.split(",") if oid.strip()]
        else:
            order_ids = [order_ids_raw]

        # Lock orders ทั้งชุดกันยิงซ้ำ/ race condition
        orders = (
            db.query(Order)
            .filter(Order.order_id.in_(order_ids))
            .with_for_update()
            .all()
        )

        if not orders:
            raise HTTPException(status_code=404, detail="Orders not found")

        # Payment เดียวผูกกับ order แรก
        payment = db.query(Payment).filter(
            Payment.payment_id == orders[0].payment_id  # ✅ ใช้ order.payment_id FK
        ).first()

        # Idempotent: ถ้า order ในชุดนี้ถูก mark PAID หมดแล้ว ก็ไม่ทำอะไร
        all_paid = all(o.status == "PAID" for o in orders)
        if all_paid:
            return

        now = now_utc()

        # 1) อัปเดต Payment → SUCCESS + บันทึก payment_intent_id และ charge_id
        if payment:
            payment.status = PaymentStatus.SUCCESS
            payment.paid_at = now
            # ✅ save payment_intent_id จาก session (ใช้ตอน payout)
            if not payment.payment_intent_id and session.get("payment_intent"):
                payment.payment_intent_id = session["payment_intent"]
            # ✅ save stripe_charge_id สำหรับใช้เป็น source_transaction ตอนโอนเงิน
            if session.get("payment_intent"):
                try:
                    pi = stripe.PaymentIntent.retrieve(session["payment_intent"])
                    if pi.get("latest_charge"):
                        payment.stripe_charge_id = pi["latest_charge"]
                except Exception as e:
                    print(f"[WEBHOOK] ⚠️ Could not retrieve charge_id: {e}")

        # 2) loop ทุก order → mark PAID + หัก stock + ลบ reservation
        for order in orders:
            if order.status == "PAID":
                continue

            order.status = "PAID"
            order.updated_at = now

            # hard cut stock
            for item in order.order_items:
                variant_id = getattr(item, "variant_id", None)
                if not variant_id:
                    # fallback: ไม่ตัดตาม variant (เคส product ไม่มี variant)
                    continue

                variant = (
                    db.query(ProductVariant)
                    .filter(ProductVariant.variant_id == variant_id)
                    .first()
                )
                if variant:
                    variant.stock = (variant.stock or 0) - item.quantity
                    if variant.stock < 0:
                        variant.stock = 0

            # ลบ StockReservation ของ order นี้
            db.query(StockReservation).filter(
                StockReservation.order_id == order.order_id
            ).delete(synchronize_session=False)

        # 3) ถ้ามาจาก Cart ให้ล้าง cart นั้นทิ้ง (ทั้งตะกร้า)
        #    (ถ้าภายหลังทำ "เลือกบาง item จาก cart" จริง ๆ ค่อย granular ที่ level CartItem)
        if is_from_cart and cart_id and user_id:
            cart = (
                db.query(Cart)
                .filter(Cart.cart_id == cart_id, Cart.user_id == user_id)
                .first()
            )
            if cart:
                db.query(CartItem).filter(
                    CartItem.cart_id == cart.cart_id
                ).delete(synchronize_session=False)

        db.commit()