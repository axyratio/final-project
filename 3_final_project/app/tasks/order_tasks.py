# app/tasks/order_tasks.py
from app.core.celery import celery_app
from app.utils.now_utc import now_utc
from app.models.order import Order, OrderStatus
from app.db.database import SessionLocal
import asyncio


@celery_app.task(name="simulate_delivery")
def simulate_delivery(order_id: str):
    """
    จำลองการจัดส่ง: รอครบเวลาแล้วเปลี่ยนสถานะเป็น DELIVERED
    → หลัง commit เรียก notify_order_delivered เพื่อ broadcast ws
    """
    db = SessionLocal()
    try:
        order: Order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            return {"ok": False, "error": "Order not found", "order_id": order_id}

        current_status = getattr(order.order_status, "value", order.order_status)

        if current_status != "SHIPPED": 
            return {
                "ok": False,
                "error": "Invalid status",
                "order_id": order_id,
                "current_status": current_status,
                "required_status": "SHIPPED",
            }

        # เปลี่ยนเป็น DELIVERED
        order.order_status = OrderStatus.DELIVERED
        order.order_text_status = "จัดส่งสำเร็จ"
        order.updated_at = now_utc()
        if hasattr(order, "delivered_at") and not order.delivered_at:
            order.delivered_at = now_utc()

        db.commit()
        db.refresh(order)

        # ✅ เพิ่มใหม่: notify ผู้ใช้ว่า จัดส่งสำเร็จ
        # Celery worker ไม่มี event loop วิ่งอยู่ เพราะนั้น asyncio.run() ใช้ได้
        try:
            from sqlalchemy.orm import joinedload
            from app.models.order_item import OrderItem
            from app.models.product import Product

            # reload order พร้อม relationships เพื่อให้ _get_order_item_preview() ทำงานได้
            order = (
                db.query(Order)
                .options(
                    joinedload(Order.order_items)
                    .joinedload(OrderItem.product)
                    .joinedload(Product.images)
                )
                .filter(Order.order_id == order_id)
                .first()
            )

            from app.services.notification_service import NotificationService
            asyncio.run(NotificationService.notify_order_delivered(db, order))
        except Exception as e:
            # notify ล้มเหลว ไม่ block task เดิม (order เปลี่ยน status ไปแล้วครับ)
            print(f"[simulate_delivery] notify failed: {e}")

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