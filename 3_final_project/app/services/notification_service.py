# app/services/notification_service.py
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from app.models.notification import Notification, NotificationType
from app.models.order import Order
from app.realtime.socket_manager import manager
from app.utils.now_utc import now_utc


class NotificationService:
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
        """สร้างการแจ้งเตือนใหม่"""
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
        
        # ส่ง realtime notification + badge count (ถ้ามี websocket เชื่อมต่อ)
        try:
            unread_count = await NotificationService.get_unread_count(
                db=db,
                user_id=user_id
            )
            await manager.broadcast(
                f"user:{user_id}",
                {
                    "type": "notification",
                    "notification": NotificationService._serialize_notification(notification),
                    "unread_count": unread_count
                }
            )
        except Exception as e:
            # ไม่ให้ realtime error มาทำให้การสร้าง notification ล้ม
            print(f"[Notification] Realtime send failed: {e}")
        return notification
    
    @staticmethod
    async def get_user_notifications(
        db: Session,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[Notification], int]:
        """ดึงการแจ้งเตือนของผู้ใช้"""
        query = db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc())
        
        total = query.count()
        notifications = query.limit(limit).offset(offset).all()
        
        return notifications, total
    
    @staticmethod
    async def get_unread_count(
        db: Session,
        user_id: UUID
    ) -> int:
        """นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน"""
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()
    
    @staticmethod
    async def mark_as_read(
        db: Session,
        notification_id: UUID,
        user_id: UUID
    ) -> bool:
        """ทำเครื่องหมายว่าอ่านแล้ว"""
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
    async def mark_all_as_read(
        db: Session,
        user_id: UUID
    ) -> int:
        """ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว"""
        updated = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            "is_read": True,
            "read_at": now_utc()
        })
        db.commit()
        return updated
    
    @staticmethod
    async def delete_notification(
        db: Session,
        notification_id: UUID,
        user_id: UUID
    ) -> bool:
        """ลบการแจ้งเตือน"""
        notification = db.query(Notification).filter(
            Notification.notification_id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if not notification:
            return False
        
        db.delete(notification)
        db.commit()
        return True
    
    # ==================== ORDER NOTIFICATION HELPERS ====================
    
    @staticmethod
    async def notify_order_delivered(
        db: Session,
        order: Order
    ):
        """แจ้งเตือนเมื่อจัดส่งสำเร็จ ⭐ ส่งการแจ้งเตือนหลักสำหรับข้อนี้"""
        product_name, image_url = NotificationService._get_order_item_preview(order)
        
        title = "📦 จัดส่งสำเร็จ!"
        message = f"คำสั่งซื้อ {product_name} ถูกจัดส่งสำเร็จแล้ว กรุณายืนยันการรับสินค้า"
        
        await NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.ORDER_DELIVERED,
            title=title,
            message=message,
            order_id=order.order_id,
            store_id=order.store_id,
            image_url=image_url
        )

    @staticmethod
    async def notify_order_cancelled_by_store(
        db: Session,
        order: Order
    ):
        """แจ้งเตือนเมื่อร้านค้ายกเลิกออเดอร์"""
        product_name, image_url = NotificationService._get_order_item_preview(order)

        title = "❌ ร้านค้ายกเลิกออเดอร์"
        message = f"คำสั่งซื้อ {product_name} ถูกร้านค้ายกเลิก หากมีข้อสงสัยกรุณาติดต่อร้านค้า"

        await NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.ORDER_CANCELLED,
            title=title,
            message=message,
            order_id=order.order_id,
            store_id=order.store_id,
            image_url=image_url
        )

    @staticmethod
    async def notify_order_approved(
        db: Session,
        order: Order
    ):
        """แจ้งเตือนเมื่อร้านค้าอนุมัติออเดอร์"""
        product_name, image_url = NotificationService._get_order_item_preview(order)

        title = "✅ ร้านค้าอนุมัติออเดอร์"
        message = f"ร้านค้าอนุมัติคำสั่งซื้อ {product_name} แล้ว กำลังเตรียมจัดส่ง"

        await NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.ORDER_PREPARING,
            title=title,
            message=message,
            order_id=order.order_id,
            store_id=order.store_id,
            image_url=image_url
        )

    @staticmethod
    async def notify_return_approved(
        db: Session,
        order: Order
    ):
        """แจ้งเตือนเมื่อร้านค้าอนุมัติการคืนสินค้า"""
        product_name, image_url = NotificationService._get_order_item_preview(order)

        title = "✅ อนุมัติการคืนสินค้า"
        message = f"ร้านค้าอนุมัติการคืนสินค้า {product_name} แล้ว กรุณาดำเนินการตามขั้นตอน"

        await NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.RETURN_APPROVED,
            title=title,
            message=message,
            order_id=order.order_id,
            store_id=order.store_id,
            image_url=image_url
        )
    
    # @staticmethod
    # async def notify_order_shipped(
    #     db: Session,
    #     order: Order
    # ):
    #     """แจ้งเตือนเมื่อจัดส่งแล้ว"""
    #     product_name = "สินค้า"
    #     if order.order_items and len(order.order_items) > 0:
    #         product_name = order.order_items[0].product_name
        
    #     title = "🚚 กำลังจัดส่ง"
    #     message = f"คำสั่งซื้อ {product_name} กำลังจัดส่งโดย {order.courier_name or 'บริษัทขนส่ง'}"
        
    #     image_url = None
    #     if order.order_items and len(order.order_items) > 0:
    #         image_url = order.order_items[0].image_url
        
    #     await NotificationService.create_notification(
    #         db=db,
    #         user_id=order.user_id,
    #         notification_type=NotificationType.ORDER_SHIPPED,
    #         title=title,
    #         message=message,
    #         order_id=order.order_id,
    #         store_id=order.store_id,
    #         image_url=image_url
    #     )
    
    # @staticmethod
    # async def notify_order_preparing(
    #     db: Session,
    #     order: Order
    # ):
    #     """แจ้งเตือนเมื่อกำลังเตรียมสินค้า"""
    #     product_name = "สินค้า"
    #     if order.order_items and len(order.order_items) > 0:
    #         product_name = order.order_items[0].product_name
        
    #     title = "📦 กำลังเตรียมสินค้า"
    #     message = f"ร้านค้ากำลังเตรียม {product_name} ของคุณ"
        
    #     image_url = None
    #     if order.order_items and len(order.order_items) > 0:
    #         image_url = order.order_items[0].image_url
        
    #     await NotificationService.create_notification(
    #         db=db,
    #         user_id=order.user_id,
    #         notification_type=NotificationType.ORDER_PREPARING,
    #         title=title,
    #         message=message,
    #         order_id=order.order_id,
    #         store_id=order.store_id,
    #         image_url=image_url
    #     )
