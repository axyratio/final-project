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
    → Issue #9: schedule auto_confirm_received ต่อเลย (1 นาที)
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

        # notify ผู้ใช้ว่าจัดส่งสำเร็จ
        try:
            from sqlalchemy.orm import joinedload
            from app.models.order_item import OrderItem
            from app.models.product import Product

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
            print(f"[simulate_delivery] notify failed: {e}")

        # Issue #9: schedule auto-confirm ถ้าลูกค้าไม่กดเองใน 1 นาที
        auto_confirm_received.apply_async(args=[order_id], countdown=604800)
        print(f"[simulate_delivery] ✅ scheduled auto_confirm in 60s for order {order_id}")

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


@celery_app.task(name="auto_confirm_received")
def auto_confirm_received(order_id: str):
    """
    Issue #9: Auto-confirm ถ้าลูกค้าไม่กดยืนยันรับสินค้าภายใน 1 นาที
    DELIVERED → COMPLETED พร้อม payout ให้ร้านค้า
    """
    db = SessionLocal()
    try:
        order: Order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            print(f"[auto_confirm] ❌ Order {order_id} not found")
            return {"ok": False, "error": "Order not found"}

        current_status = getattr(order.order_status, "value", order.order_status)

        # ลูกค้ากดยืนยันเองแล้ว หรือเริ่มคืนสินค้าแล้ว → หยุด
        if current_status != "DELIVERED":
            print(f"[auto_confirm] Order {order_id} already {current_status}, skip")
            return {"ok": False, "skipped": True, "current_status": current_status}

        print(f"[auto_confirm] 🔄 Auto-confirming order {order_id}")

        # Issue #9: Payout ก่อน แล้วค่อยเปลี่ยนเป็น COMPLETED
        # (ถ้า payout ก่อนเปลี่ยน status จะยังเป็น DELIVERED อยู่ → payout_service เช็คผ่าน)
        try:
            from uuid import UUID
            from app.services.payout_service import PayoutService

            payout_result = asyncio.run(
                PayoutService.process_payout_on_delivery_confirmation(
                    db=db, order_id=UUID(order_id)
                )
            )
            print(f"[auto_confirm] 💰 Payout done: {payout_result}")
        except Exception as e:
            print(f"[auto_confirm] ⚠️ Payout failed (non-blocking): {e}")

        # เปลี่ยนเป็น COMPLETED หลัง payout
        # (payout_service อาจเปลี่ยนให้แล้ว แต่ set ซ้ำได้ไม่มีผลเสีย)
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if order and getattr(order.order_status, "value", order.order_status) != "COMPLETED":
            order.order_status = OrderStatus.COMPLETED
            order.order_text_status = "ยืนยันรับสินค้าอัตโนมัติ"
            order.completed_at = now_utc()
            order.updated_at = now_utc()
            db.commit()

        print(f"[auto_confirm] ✅ Order {order_id} → COMPLETED")

        return {"ok": True, "order_id": order_id, "status": "COMPLETED"}

    except Exception as e:
        db.rollback()
        print(f"[auto_confirm] ❌ Error: {e}")
        return {"ok": False, "error": str(e)}
    finally:
        db.close()