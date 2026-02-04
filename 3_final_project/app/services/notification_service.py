# app/services/notification_service.py
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from app.models.notification import Notification, NotificationType
from app.models.order import Order
from app.realtime.socket_manager import manager
from app.utils.now_utc import now_utc


class NotificationService:

    # ─────────────────────────────────────────
    # Serializer: แปลง ORM → dict (JSON-safe)
    # ─────────────────────────────────────────
    @staticmethod
    def _serialize_notification(notification: Notification) -> dict:
        notification_type = notification.notification_type
        if hasattr(notification_type, "value"):
            notification_type = notification_type.value
        return {
            "notification_id": str(notification.notification_id),
            "notification_type": notification_type,
            "title": notification.title,
            "message": notification.message,
            "order_id": str(notification.order_id) if notification.order_id else None,
            "store_id": str(notification.store_id) if notification.store_id else None,
            "conversation_id": str(notification.conversation_id) if notification.conversation_id else None,
            "image_url": notification.image_url,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
            "read_at": notification.read_at.isoformat() if notification.read_at else None,
        }

    # ─────────────────────────────────────────
    # Helper: ดึง product name + image จาก order item แรก
    # ─────────────────────────────────────────
    @staticmethod
    def _get_order_item_preview(order: Order) -> tuple[str, Optional[str]]:
        product_name = "สินค้า"
        image_url = None
        if order.order_items and len(order.order_items) > 0:
            item = order.order_items[0]
            item_product = getattr(item, "product", None)
            if getattr(item, "product_name", None):
                product_name = item.product_name
            elif item_product and getattr(item_product, "product_name", None):
                product_name = item_product.product_name
            image_url = getattr(item, "image_url", None)
            if not image_url and item_product and getattr(item_product, "images", None):
                image_url = item_product.images[0].image_url if item_product.images else None
        return product_name, image_url

    # ─────────────────────────────────────────
    # CORE: สร้าง notification + broadcast realtime
    # ─────────────────────────────────────────
    @staticmethod
    async def create_notification(
        db: Session,
        user_id: UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        order_id: Optional[UUID] = None,
        store_id: Optional[UUID] = None,
        conversation_id: Optional[UUID] = None,
        image_url: Optional[str] = None
    ) -> Notification:
        """
        สร้าง Notification record → บันทึก DB
        → broadcast ผ่าน WebSocket room "user:<user_id>"
        """
        print(f"\n{'='*80}")
        print(f"[NOTIFICATION_SERVICE] 🎯 create_notification CALLED")
        print(f"[NOTIFICATION_SERVICE] Parameters:")
        print(f"  - user_id: {user_id}")
        print(f"  - type: {notification_type}")
        print(f"  - title: {title}")
        print(f"  - message: {message}")
        print(f"  - order_id: {order_id}")
        print(f"  - store_id: {store_id}")
        print(f"  - conversation_id: {conversation_id}")
        print(f"  - image_url: {image_url}")
        print(f"{'='*80}\n")
        
        # 1. บันทึกลง DB
        print(f"[NOTIFICATION_SERVICE] 💾 Creating notification record in DB...")
        
        try:
            notification = Notification(
                user_id=user_id,
                notification_type=notification_type,
                title=title,
                message=message,
                order_id=order_id,
                store_id=store_id,
                conversation_id=conversation_id,
                image_url=image_url,
                is_read=False
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)
            
            print(f"[NOTIFICATION_SERVICE] ✅ Notification saved to DB")
            print(f"  - notification_id: {notification.notification_id}")
            print(f"  - created_at: {notification.created_at}")
            
        except Exception as e:
            print(f"[NOTIFICATION_SERVICE] ❌ DB save failed: {e}")
            print(f"[NOTIFICATION_SERVICE] Exception type: {type(e).__name__}")
            import traceback
            print(f"[NOTIFICATION_SERVICE] Traceback:\n{traceback.format_exc()}")
            db.rollback()
            raise

        # 2. Broadcast ผ่าน WebSocket
        print(f"\n[NOTIFICATION_SERVICE] 📡 Broadcasting via WebSocket...")
        print(f"[NOTIFICATION_SERVICE] Target room: user:{user_id}")
        
        try:
            unread_count = await NotificationService.get_unread_count(db=db, user_id=user_id)
            print(f"[NOTIFICATION_SERVICE] Current unread_count: {unread_count}")
            
            serialized = NotificationService._serialize_notification(notification)
            print(f"[NOTIFICATION_SERVICE] Serialized notification:")
            print(f"{serialized}")
            
            payload = {
                "type": "notification",
                "notification": serialized,
                "unread_count": unread_count
            }
            
            print(f"\n[NOTIFICATION_SERVICE] 🚀 Calling manager.broadcast...")
            print(f"[NOTIFICATION_SERVICE] Room: user:{user_id}")
            print(f"[NOTIFICATION_SERVICE] Payload keys: {payload.keys()}")
            
            await manager.broadcast(
                f"user:{user_id}",
                payload
            )
            
            print(f"[NOTIFICATION_SERVICE] ✅ WebSocket broadcast completed")
            
        except Exception as e:
            print(f"[NOTIFICATION_SERVICE] ⚠️ WebSocket broadcast failed: {e}")
            print(f"[NOTIFICATION_SERVICE] Exception type: {type(e).__name__}")
            import traceback
            print(f"[NOTIFICATION_SERVICE] Traceback:\n{traceback.format_exc()}")
            # ไม่ให้ realtime error ทำให้สร้าง notification ล้ม
        
        print(f"\n[NOTIFICATION_SERVICE] ✅ create_notification completed")
        print(f"{'='*80}\n")
        
        return notification

    # ─────────────────────────────────────────
    # READ: ดึงรายการ / นับ unread
    # ─────────────────────────────────────────
    @staticmethod
    async def get_user_notifications(
        db: Session,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[Notification], int]:
        """ดึงการแจ้งเตือนของผู้ใช้ (เรียงล่าสุดก่อน)"""
        query = db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc())

        total = query.count()
        notifications = query.limit(limit).offset(offset).all()
        return notifications, total

    @staticmethod
    async def get_unread_count(db: Session, user_id: UUID) -> int:
        """นับจำนวน notification ที่ยังไม่อ่าน"""
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    # ─────────────────────────────────────────
    # UPDATE: อ่านแล้ว / อ่านทั้งหมด
    # ─────────────────────────────────────────
    @staticmethod
    async def mark_as_read(db: Session, notification_id: UUID, user_id: UUID) -> bool:
        notification = db.query(Notification).filter(
            Notification.notification_id == notification_id,
            Notification.user_id == user_id
        ).first()
        if not notification:
            return False
        notification.is_read = True
        notification.read_at = now_utc()
        db.commit()
        return True

    @staticmethod
    async def mark_all_as_read(db: Session, user_id: UUID) -> int:
        updated = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True, "read_at": now_utc()})
        db.commit()
        return updated

    # ─────────────────────────────────────────
    # DELETE
    # ─────────────────────────────────────────
    @staticmethod
    async def delete_notification(db: Session, notification_id: UUID, user_id: UUID) -> bool:
        notification = db.query(Notification).filter(
            Notification.notification_id == notification_id,
            Notification.user_id == user_id
        ).first()
        if not notification:
            return False
        db.delete(notification)
        db.commit()
        return True

    # ============================================================
    # ORDER NOTIFICATION HELPERS
    # ============================================================

    # 1️⃣ จัดส่งสำเร็จ
    @staticmethod
    async def notify_order_delivered(db: Session, order: Order):
        """จัดส่งสำเร็จ"""
        print(f"\n{'='*80}")
        print(f"[NOTIFICATION_SERVICE] 🎯 notify_order_delivered CALLED")
        print(f"[NOTIFICATION_SERVICE] order_id: {order.order_id}")
        print(f"[NOTIFICATION_SERVICE] user_id (buyer): {order.user_id}")
        print(f"{'='*80}\n")
        
        product_name, image_url = NotificationService._get_order_item_preview(order)
        print(f"[NOTIFICATION_SERVICE] Product: {product_name}")

        await NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.ORDER_DELIVERED,
            title="📦 จัดส่งสำเร็จ!",
            message=f"คำสั่งซื้อ {product_name} ถูกจัดส่งสำเร็จแล้ว กรุณายืนยันการรับสินค้า",
            order_id=order.order_id,
            store_id=order.store_id,
            image_url=image_url
        )

    # 2️⃣ ร้านค้ายกเลิกออเดอร์
    @staticmethod
    async def notify_order_cancelled_by_store(db: Session, order: Order):
        """ร้านค้ายกเลิกออเดอร์"""
        print(f"\n{'='*80}")
        print(f"[NOTIFICATION_SERVICE] 🎯 notify_order_cancelled_by_store CALLED")
        print(f"[NOTIFICATION_SERVICE] order_id: {order.order_id}")
        print(f"[NOTIFICATION_SERVICE] user_id (buyer): {order.user_id}")
        print(f"{'='*80}\n")
        
        product_name, image_url = NotificationService._get_order_item_preview(order)
        print(f"[NOTIFICATION_SERVICE] Product: {product_name}")

        await NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.ORDER_CANCELLED,
            title="❌ ร้านค้ายกเลิกออเดอร์",
            message=f"คำสั่งซื้อ {product_name} ถูกร้านค้ายกเลิก หากมีข้อสงสัยกรุณาติดต่อร้านค้า",
            order_id=order.order_id,
            store_id=order.store_id,
            image_url=image_url
        )

    # 3️⃣ ร้านค้าอนุมัติออเดอร์
    @staticmethod
    async def notify_order_approved(db: Session, order: Order):
        """ร้านค้าอนุมัติออเดอร์"""
        print(f"\n{'='*80}")
        print(f"[NOTIFICATION_SERVICE] 🎯 notify_order_approved CALLED")
        print(f"[NOTIFICATION_SERVICE] order_id: {order.order_id}")
        print(f"[NOTIFICATION_SERVICE] user_id (buyer): {order.user_id}")
        print(f"[NOTIFICATION_SERVICE] store_id: {order.store_id}")
        print(f"{'='*80}\n")
        
        try:
            product_name, image_url = NotificationService._get_order_item_preview(order)
            print(f"[NOTIFICATION_SERVICE] 📦 Product preview:")
            print(f"  - product_name: {product_name}")
            print(f"  - image_url: {image_url}")
        except Exception as e:
            print(f"[NOTIFICATION_SERVICE] ⚠️ Failed to get product preview: {e}")
            product_name = "สินค้า"
            image_url = None

        print(f"\n[NOTIFICATION_SERVICE] 🚀 Calling create_notification...")
        
        try:
            await NotificationService.create_notification(
                db=db,
                user_id=order.user_id,
                notification_type=NotificationType.ORDER_PREPARING,
                title="✅ ร้านค้าอนุมัติออเดอร์",
                message=f"ร้านค้าอนุมัติคำสั่งซื้อ {product_name} แล้ว กำลังเตรียมจัดส่ง",
                order_id=order.order_id,
                store_id=order.store_id,
                image_url=image_url
            )
            print(f"[NOTIFICATION_SERVICE] ✅ notify_order_approved completed successfully")
            
        except Exception as e:
            print(f"[NOTIFICATION_SERVICE] ❌ notify_order_approved failed: {e}")
            import traceback
            print(f"[NOTIFICATION_SERVICE] Traceback:\n{traceback.format_exc()}")
            raise

    # 4️⃣ ร้านค้าอนุมัติการคืนสินค้า
    @staticmethod
    async def notify_return_approved(db: Session, order: Order):
        """ร้านค้าอนุมัติการคืนสินค้า"""
        print(f"\n{'='*80}")
        print(f"[NOTIFICATION_SERVICE] 🎯 notify_return_approved CALLED")
        print(f"[NOTIFICATION_SERVICE] order_id: {order.order_id}")
        print(f"[NOTIFICATION_SERVICE] user_id (buyer): {order.user_id}")
        print(f"{'='*80}\n")
        
        product_name, image_url = NotificationService._get_order_item_preview(order)
        print(f"[NOTIFICATION_SERVICE] Product: {product_name}")

        await NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.RETURN_APPROVED,
            title="✅ อนุมัติการคืนสินค้า",
            message=f"ร้านค้าอนุมัติการคืนสินค้า {product_name} แล้ว กรุณาดำเนินการตามขั้นตอน",
            order_id=order.order_id,
            store_id=order.store_id,
            image_url=image_url
        )