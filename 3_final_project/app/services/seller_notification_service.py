# app/services/seller_notification_service.py
from sqlalchemy.orm import Session
from app.models.seller_notification import SellerNotification
from app.realtime.socket_manager import manager
from datetime import datetime
from uuid import uuid4
import asyncio


class SellerNotificationService:
    """
    Service สำหรับส่งการแจ้งเตือนแบบ real-time ไปยัง seller ผ่าน WebSocket
    """
    
    @staticmethod
    async def send_notification(
        db: Session,
        store_id: str,
        notification_type: str,
        title: str,
        message: str,
        order_id: str = None,
        return_id: str = None,
        product_id: str = None
    ):
        """
        สร้างและส่งการแจ้งเตือนไปยัง seller ผ่าน WebSocket
        
        Args:
            store_id: รหัสร้านค้า
            notification_type: ประเภท (ORDER_RECEIVED, ORDER_COMPLETED, RETURN_REQUEST, LOW_STOCK)
            title: หัวข้อการแจ้งเตือน
            message: ข้อความ
            order_id: รหัสออเดอร์ (ถ้ามี)
            return_id: รหัสการคืนสินค้า (ถ้ามี)
            product_id: รหัสสินค้า (ถ้ามี)
        """
        
        # 1. บันทึกการแจ้งเตือนลงฐานข้อมูล
        notification = SellerNotification(
            notification_id=str(uuid4()),
            store_id=store_id,
            type=notification_type,
            title=title,
            message=message,
            order_id=order_id,
            return_id=return_id,
            product_id=product_id,
            is_read=False,
            created_at=datetime.utcnow()
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        # 2. ส่งการแจ้งเตือนผ่าน WebSocket
        room = f"seller:{store_id}"
        
        notification_data = {
            "type": "NOTIFICATION",
            "notification_id": str(notification.notification_id),
            "notification_type": notification.type,
            "title": notification.title,
            "message": notification.message,
            "order_id": notification.order_id,
            "return_id": notification.return_id,
            "product_id": notification.product_id,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat()
        }
        
        # ส่งผ่าน WebSocket แบบ async
        await manager.broadcast(room, notification_data)
        
        print(f"[Seller Notification] Sent to {room}: {title}")
        
        return notification
    
    @staticmethod
    def send_notification_sync(
        db: Session,
        store_id: str,
        notification_type: str,
        title: str,
        message: str,
        order_id: str = None,
        return_id: str = None,
        product_id: str = None
    ):
        """
        Synchronous wrapper สำหรับเรียกจาก sync context
        """
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(
            SellerNotificationService.send_notification(
                db=db,
                store_id=store_id,
                notification_type=notification_type,
                title=title,
                message=message,
                order_id=order_id,
                return_id=return_id,
                product_id=product_id
            )
        )


# ================== Helper Functions ==================

async def notify_order_received(db: Session, store_id: str, order_id: str, order_number: str, total_amount: float):
    """แจ้งเตือนเมื่อได้รับออเดอร์ใหม่"""
    await SellerNotificationService.send_notification(
        db=db,
        store_id=store_id,
        notification_type="ORDER_RECEIVED",
        title="🛒 มีออเดอร์ใหม่!",
        message=f"คุณได้รับออเดอร์ #{order_number} มูลค่า ฿{total_amount:,.2f}",
        order_id=order_id
    )


async def notify_order_completed(db: Session, store_id: str, order_id: str, order_number: str):
    """แจ้งเตือนเมื่อออเดอร์เสร็จสมบูรณ์"""
    await SellerNotificationService.send_notification(
        db=db,
        store_id=store_id,
        notification_type="ORDER_COMPLETED",
        title="✅ ออเดอร์สำเร็จ",
        message=f"ออเดอร์ #{order_number} เสร็จสมบูรณ์แล้ว",
        order_id=order_id
    )


async def notify_return_request(db: Session, store_id: str, return_id: str, order_number: str, reason: str):
    """แจ้งเตือนเมื่อมีคำขอคืนสินค้า"""
    await SellerNotificationService.send_notification(
        db=db,
        store_id=store_id,
        notification_type="RETURN_REQUEST",
        title="↩️ มีคำขอคืนสินค้า",
        message=f"ออเดอร์ #{order_number} ขอคืนสินค้า: {reason}",
        return_id=return_id
    )


async def notify_low_stock(db: Session, store_id: str, product_id: str, product_name: str, stock_left: int):
    """แจ้งเตือนเมื่อสินค้าเหลือน้อย"""
    await SellerNotificationService.send_notification(
        db=db,
        store_id=store_id,
        notification_type="LOW_STOCK",
        title="⚠️ สินค้าใกล้หมด",
        message=f"{product_name} เหลือเพียง {stock_left} ชิ้น",
        product_id=product_id
    )