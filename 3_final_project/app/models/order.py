# app/models/order.py
from sqlalchemy import Boolean, Column, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
from app.utils.now_utc import now_utc
import uuid
from enum import Enum as PyEnum


class OrderStatus(str, PyEnum):
    UNPAID = "UNPAID"          # รอชำระเงิน
    PAID = "PAID"              # ชำระเงินแล้ว
    PREPARING = "PREPARING"    # กำลังเตรียมสินค้า
    SHIPPED = "SHIPPED"        # จัดส่งแล้ว
    DELIVERED = "DELIVERED"    # จัดส่งสำเร็จ
    COMPLETED = "COMPLETED"    # ลูกค้ายืนยันรับแล้ว
    RETURNING = "RETURNING"    # กำลังคืนสินค้า
    RETURNED = "RETURNED"      # คืนสินค้าแล้ว
    CANCELLED = "CANCELLED"    # ยกเลิก
    FAILED = "FAILED"          # ล้มเหลว


class Order(Base):
    __tablename__ = 'orders'

    order_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    ship_addr_id = Column(UUID(as_uuid=True), ForeignKey('shipping_addresses.ship_addr_id'), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.store_id"), nullable=True)

    # ผูกกับ Payment (N orders → 1 payment)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.payment_id"), nullable=True)

    is_locked = Column(Boolean, default=False)

    # ✅ เปลี่ยน default เป็น UNPAID
    order_status = Column(String, nullable=False, default='UNPAID')
    order_text_status = Column(String, nullable=False, default="รอชำระเงิน")
    
    customer_name = Column(String, nullable=False)
    shipping_cost = Column(Float, nullable=False, default=0.00)
    tracking_number = Column(String, nullable=True)
    courier_name = Column(String, nullable=True)
    total_price = Column(Float, nullable=False)
    
    # ✅ Timestamps
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), onupdate=now_utc, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)           # เมื่อชำระเงินสำเร็จ
    delivered_at = Column(DateTime(timezone=True), nullable=True)      # เมื่อจัดส่งสำเร็จ
    completed_at = Column(DateTime(timezone=True), nullable=True)      # เมื่อลูกค้ายืนยันรับ

    # Relationships
    store = relationship("Store", back_populates="orders")
    user = relationship('User', back_populates='orders')
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    # N orders → 1 payment
    payment = relationship("Payment", back_populates="orders")

    # tracking_histories = relationship(
    #     "TrackingHistory",
    #     back_populates="order",
    #     cascade="all, delete-orphan",
    #     foreign_keys="[TrackingHistory.order_id]"
    # )

    shipping_address = relationship("ShippingAddress", back_populates="orders")

    # def update_status_from_tracking(self):
    #     """อัพเดตสถานะจาก tracking history"""
    #     if not self.tracking_histories:
    #         return

    #     latest = sorted(self.tracking_histories, key=lambda t: t.current_time)[-1]
    #     self.order_text_status = latest.status_text

    #     if latest.status_code.name == "DELIVERED":
    #         self.order_status = "DELIVERED"
    #         if not self.delivered_at:
    #             self.delivered_at = now_utc()
    #     elif latest.status_code.name in ("IN_TRANSIT", "OUT_FOR_DELIVERY"):
    #         self.order_status = "SHIPPED"
    #     elif latest.status_code.name == "FAILED":
    #         self.order_status = "FAILED"