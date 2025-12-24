# app/tasks/order_tasks.py
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.celery import celery_app
from app.db.database import SessionLocal  # ต้องแน่ใจว่า import ถูก path
from app.models.order import Order
from app.models.payment import Payment, PaymentStatus
from app.models.stock_reservation import StockReservation

# ตั้ง Logger เอาไว้ดูใน Terminal ของ Celery
logger = get_task_logger(__name__)

@celery_app.task
def check_order_timeout(order_id_str: str):
    """
    Task นี้จะถูกเรียกเมื่อครบเวลา (เช่น 15 นาที)
    หน้าที่: เช็คว่าจ่ายเงินยัง? ถ้ายัง -> ยกเลิกออเดอร์ + คืนของ
    """
    db: Session = SessionLocal()
    try:
        # แปลง string กลับเป็น UUID
        order_id = UUID(order_id_str)
        
        order = db.query(Order).filter(Order.order_id == order_id).first()
        
        if not order:
            logger.warning(f"Order {order_id} not found.")
            return

        # ✅ เงื่อนไขการยกเลิก: ต้องเป็น PENDING เท่านั้น
        if order.order_status == "PENDING":
            logger.info(f"Order {order_id} timed out. Cancelling...")

            # 1. เปลี่ยนสถานะ Order
            order.order_status = "CANCELLED"
            order.order_text_status = "ยกเลิกอัตโนมัติ (หมดเวลาชำระเงิน)"

            # 2. คืน Stock (ลบ Reservation ทิ้ง)
            # หมายเหตุ: ปกติถ้าลบ Reservation stock จริงจะกลับมา available เองตาม Logic ที่คุณเขียนไว้ใน _validate_stock_only
            db.query(StockReservation).filter(StockReservation.order_id == order_id).delete()

            # 3. ยกเลิก Payment (ถ้ามี)
            if order.payment_id:
                payment = db.query(Payment).filter(Payment.payment_id == order.payment_id).first()
                if payment and payment.status == PaymentStatus.PENDING:
                    payment.status = PaymentStatus.CANCELED
            
            db.commit()
            logger.info(f"Order {order_id} has been cancelled successfully.")
        
        else:
            logger.info(f"Order {order_id} status is {order.order_status}. No action taken.")

    except Exception as e:
        logger.error(f"Error checking order timeout: {e}")
        db.rollback()
    finally:
        db.close()