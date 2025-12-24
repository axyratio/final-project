# app/services/payout_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID
import stripe

from app.models.order import Order
from app.models.store import Store
from app.models.payment import Payment, PaymentStatus
from app.models.store_payout import StorePayout
from app.utils.now_utc import now_utc
from app.core.config import settings

PLATFORM_FEE_PERCENT = 10.0  # สมมติ platform หัก 10%

class PayoutService:

    @staticmethod
    def payout_order_to_store(db: Session, order_id: UUID, user_id: UUID) -> StorePayout:
        # 1) ดึง order
        order: Order = (
            db.query(Order)
            .filter(
                Order.order_id == order_id,
                Order.user_id == user_id,   # กันคนอื่นมากดของชาวบ้าน
            )
            .first()
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if order.order_status != "DELIVERED":
            # ตรงนี้แล้วแต่ policy มึง จะให้กดยืนยันตอนสถานะไหน
            raise HTTPException(status_code=400, detail="Order ยังไม่อยู่ในสถานะ DELIVERED")

        store: Store = order.store
        if not store or not store.stripe_account_id:
            raise HTTPException(status_code=400, detail="ร้านค้านี้ยังไม่ผูก Stripe Connect")

        # 2) หา Payment เดิม
        payment: Payment = (
            db.query(Payment)
            .filter(Payment.order_id == order.order_id)  # ตอนนี้มึงผูก payment กับ order แรกเท่านั้น
            .first()
        )
        if not payment or payment.status != PaymentStatus.SUCCESS:
            raise HTTPException(status_code=400, detail="ยังไม่มีการชำระเงินสำเร็จ")

        # 3) เช็คว่าเคยโอนให้ order นี้แล้วหรือยัง
        existing = (
            db.query(StorePayout)
            .filter(
                StorePayout.order_id == order.order_id,
                StorePayout.store_id == store.store_id,
            )
            .first()
        )
        if existing and existing.status == "SUCCESS":
            raise HTTPException(status_code=400, detail="Order นี้โอนเงินเข้าร้านไปแล้ว")

        # 4) คำนวณจำนวนเงินสำหรับร้านนี้
        order_amount = order.total_price  # รวมสินค้าของร้านนี้ + shipping (แล้วแต่มึง)
        platform_fee = (order_amount * PLATFORM_FEE_PERCENT) / 100.0
        transfer_amount = order_amount - platform_fee
        if transfer_amount <= 0:
            raise HTTPException(status_code=400, detail="จำนวนเงินหลังหัก fee น้อยกว่าหรือเท่ากับ 0")

        # 5) สร้าง StorePayout ใน DB (สถานะ PENDING ก่อน)
        payout = StorePayout(
            store_id=store.store_id,
            order_id=order.order_id,
            payment_id=payment.payment_id,
            amount=transfer_amount,
            platform_fee=platform_fee,
            status="PENDING",
        )
        db.add(payout)
        db.commit()
        db.refresh(payout)

        # 6) สั่ง Stripe Transfer (เงินจาก platform → ร้าน)
        try:
            transfer = stripe.Transfer.create(
                amount=int(transfer_amount * 100),       # เป็นสตางค์
                currency="thb",
                destination=store.stripe_account_id,     # connected account
                source_transaction=payment.payment_intent_id, # tie กลับไปที่ charge เดิม
                transfer_group=str(payment.payment_id),  # ให้มันอยู่กรุ๊ปเดียวกับ charge
            )

            payout.stripe_transfer_id = transfer.id
            payout.status = "SUCCESS"
            payout.paid_at = now_utc()
            db.commit()
            db.refresh(payout)

        except Exception as e:
            db.rollback()
            # mark เป็น FAILED เพื่อจะได้เห็นว่าพยายามโอนแล้วแต่ fail
            payout.status = "FAILED"
            db.add(payout)
            db.commit()
            raise HTTPException(status_code=500, detail=f"โอนเงินให้ร้านล้มเหลว: {str(e)}")

        return payout
