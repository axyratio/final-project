# app/services/notification_service.py
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from app.models.notification import Notification, NotificationType
from app.models.order import Order
from app.utils.now_utc import now_utc


class NotificationService:
    
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
        # ดึงชื่อสินค้าตัวแรก
        product_name = "สินค้า"
        if order.order_items and len(order.order_items) > 0:
            product_name = order.order_items[0].product_name
        
        title = "📦 จัดส่งสำเร็จ!"
        message = f"คำสั่งซื้อ {product_name} ถูกจัดส่งสำเร็จแล้ว กรุณายืนยันการรับสินค้า"
        
        # ดึง image_url จาก order_items
        image_url = None
        if order.order_items and len(order.order_items) > 0:
            image_url = order.order_items[0].image_url
        
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
    async def notify_order_shipped(
        db: Session,
        order: Order
    ):
        """แจ้งเตือนเมื่อจัดส่งแล้ว"""
        product_name = "สินค้า"
        if order.order_items and len(order.order_items) > 0:
            product_name = order.order_items[0].product_name
        
        title = "🚚 กำลังจัดส่ง"
        message = f"คำสั่งซื้อ {product_name} กำลังจัดส่งโดย {order.courier_name or 'บริษัทขนส่ง'}"
        
        image_url = None
        if order.order_items and len(order.order_items) > 0:
            image_url = order.order_items[0].image_url
        
        await NotificationService.create_notification(
            db=db,
            user_id=order.user_id,
            notification_type=NotificationType.ORDER_SHIPPED,
            title=title,
            message=message,
            order_id=order.order_id,
            store_id=order.store_id,
            image_url=image_url
        )
    
    @staticmethod
    async def notify_order_preparing(
        db: Session,
        order: Order
    ):
        """แจ้งเตือนเมื่อกำลังเตรียมสินค้า"""
        product_name = "สินค้า"
        if order.order_items and len(order.order_items) > 0:
            product_name = order.order_items[0].product_name
        
        title = "📦 กำลังเตรียมสินค้า"
        message = f"ร้านค้ากำลังเตรียม {product_name} ของคุณ"
        
        image_url = None
        if order.order_items and len(order.order_items) > 0:
            image_url = order.order_items[0].image_url
        
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