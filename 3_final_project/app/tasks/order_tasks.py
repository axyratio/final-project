# app/tasks/order_tasks.py
from app.core.celery import celery_app
from app.utils.now_utc import now_utc
from app.models.order import Order, OrderStatus

# ✅ ปรับ import นี้ให้ตรงกับโปรเจกต์คุณ
from app.db.database import SessionLocal


@celery_app.task(name="simulate_delivery")
def simulate_delivery(order_id: str):
    """
    จำลองการจัดส่ง: รอครบเวลาแล้วเปลี่ยนสถานะเป็น DELIVERED
    """
    db = SessionLocal()
    try:
        order: Order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            return {"ok": False, "error": "Order not found", "order_id": order_id}

        # ถ้าโดนเปลี่ยนสถานะไปแล้ว ก็ไม่ต้องทำซ้ำ
        current_status = getattr(order.order_status, "value", order.order_status)

        # เปลี่ยนจากเช็ค PREPARING เป็นเช็ค SHIPPED
        if current_status != "SHIPPED": 
            return {
                "ok": False,
                "error": "Invalid status",
                "order_id": order_id,
                "current_status": current_status,
                "required_status": "SHIPPED", # แก้ให้ตรงกับความเป็นจริง
            }

        # ✅ เปลี่ยนเป็น DELIVERED
        order.order_status = OrderStatus.DELIVERED
        order.order_text_status = "จัดส่งสำเร็จ"
        order.updated_at = now_utc()

        # เผื่อระบบคุณต้อง set delivered_at เอง
        if hasattr(order, "delivered_at") and not order.delivered_at:
            order.delivered_at = now_utc()

        db.commit()
        db.refresh(order)

        return {
            "ok": True,
            "order_id": order_id,
            "status": getattr(order.order_status, "value", order.order_status),
            "status_text": getattr(order, "order_text_status", None),
        }
        
    except Exception as e:
        db.rollback()
        return {"ok": False, "error": str(e), "order_id": order_id}
    finally:
        db.close()
