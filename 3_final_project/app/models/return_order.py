# app/models/return_order.py
import enum
from sqlalchemy import Column, Numeric, String, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.db.database import Base
from app.utils.now_utc import now_utc
import uuid


class ReturnStatus(enum.Enum):
    """สถานะการคืนสินค้า"""
    PENDING = "PENDING"           # รอร้านค้าตรวจสอบ
    APPROVED = "APPROVED"         # ร้านค้าอนุมัติ
    REJECTED = "REJECTED"         # ร้านค้าปฏิเสธ
    REFUNDED = "REFUNDED"         # คืนเงินแล้ว
    CANCELLED = "CANCELLED"       # ยกเลิก


class ReturnReason(enum.Enum):
    """เหตุผลการคืนสินค้า"""
    WRONG_ITEM = "WRONG_ITEM"                 # สินค้าผิดจากที่สั่ง
    DAMAGED = "DAMAGED"                       # สินค้าเสียหาย
    NOT_AS_DESCRIBED = "NOT_AS_DESCRIBED"     # ไม่ตรงตามคำอธิบาย
    DEFECTIVE = "DEFECTIVE"                   # สินค้ามีตำหนิ
    SIZE_ISSUE = "SIZE_ISSUE"                 # ไซส์ไม่เหมาะ
    QUALITY_ISSUE = "QUALITY_ISSUE"           # คุณภาพไม่ดี
    OTHER = "OTHER"                           # อื่นๆ


class ReturnOrder(Base):
    """
    ตารางเก็บข้อมูลการคืนสินค้า
    
    📝 NOTE: ต้องเพิ่มตารางนี้ในฐานข้อมูล!
    Run migration หรือ create table ใหม่
    """
    __tablename__ = 'return_orders'

    return_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    
    # เหตุผลและรายละเอียด
    reason = Column(Enum(ReturnReason, name="return_reason_enum"), nullable=False)
    reason_detail = Column(Text, nullable=True)  # คำอธิบายเพิ่มเติม
    
    # รูปภาพประกอบ (เก็บเป็น array ของ URLs)
    image_urls = Column(ARRAY(String), nullable=True)
    
    # สถานะ
    status = Column(Enum(ReturnStatus, name="return_status_enum"), default=ReturnStatus.PENDING)
    status_text = Column(String, default="รอร้านค้าตรวจสอบ")
    
    # เงินที่จะคืน
    refund_amount = Column(Numeric(precision=10, scale=2), nullable=True)
    
    # หมายเหตุจากร้าน (กรณีปฏิเสธ)
    store_note = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), onupdate=now_utc, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    order = relationship("Order", backref="return_requests")
    user = relationship("User", backref="return_requests")
    
    
class ReturnImage(Base):
    """
    ตารางเก็บรูปภาพชั่วคราวก่อนสร้างคำขอคืนสินค้า
    
    📝 เก็บ image_id ไว้ให้ frontend อ้างอิง
    📝 เมื่อสร้าง ReturnOrder จริง ก็เอา URL จาก table นี้ไปใส่ใน ReturnOrder.image_urls
    """
    __tablename__ = 'return_images'

    image_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    return_id = Column(UUID(as_uuid=True), ForeignKey('return_orders.return_id'), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    
    image_url = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=now_utc)
    
    # Relationships
    user = relationship("User", backref="return_images")
    return_order = relationship("ReturnOrder", backref="temp_images", foreign_keys=[return_id])