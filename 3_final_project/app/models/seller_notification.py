# app/models/seller_notification.py
import uuid
import enum
from sqlalchemy import Column, String, ForeignKey, DateTime, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
from app.utils.now_utc import now_utc


class NotificationType(enum.Enum):
    """ประเภทการแจ้งเตือน"""
    ORDER_RECEIVED = "ORDER_RECEIVED"       # มีออเดอร์ใหม่
    ORDER_COMPLETED = "ORDER_COMPLETED"     # ลูกค้ายืนยันรับสินค้า
    RETURN_REQUEST = "RETURN_REQUEST"       # มีคำขอคืนสินค้า
    LOW_STOCK = "LOW_STOCK"                 # สต็อกสินค้าใกล้หมด


class SellerNotification(Base):
    """การแจ้งเตือนสำหรับร้านค้า"""
    __tablename__ = 'seller_notifications'

    notification_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey('stores.store_id'), nullable=False)
    
    # ประเภทและเนื้อหา
    type = Column(Enum(NotificationType, name="notification_type_enum"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # อ้างอิงถึง order (ถ้ามี)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=True)
    
    # สถานะ
    is_read = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=now_utc)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    store = relationship("Store", backref="notifications")
    order = relationship("Order", backref="seller_notifications")