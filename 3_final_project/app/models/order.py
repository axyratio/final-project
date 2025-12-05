from sqlalchemy import Boolean, Column, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
from app.utils.now_utc import now_utc
import uuid


class Order(Base):
    __tablename__ = 'orders'

    order_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
    ship_addr_id = Column(UUID(as_uuid=True), ForeignKey('shipping_addresses.ship_addr_id'), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.store_id"), nullable=True)

    is_locked = Column(Boolean, default=False)  # กันการซื้อซ้ำ

    order_status = Column(String, nullable=False, default='PENDING')  # PENDING / SHIPPED / DELIVERED
    order_text_status = Column(String, nullable=False, default="กำลังจัดเตรียม")
    customer_name = Column(String, nullable=False)
    shipping_cost = Column(Float, nullable=False, default=0.00)
    tracking_number = Column(String, nullable=True)
    courier_name = Column(String, nullable=True)
    total_price = Column(Float, nullable=False)

    # store = relationship("Store", back_populates="orders")
    store = relationship("Store", back_populates="orders")   # 👈 แนะนำให้มี
    user = relationship('User', back_populates='orders')
    order_items = relationship("OrderItem", back_populates="order")
    payment = relationship("Payment", back_populates="order", uselist=False)
    tracking_histories = relationship(
    "TrackingHistory",
    back_populates="order",
    cascade="all, delete-orphan",
    foreign_keys="[TrackingHistory.order_id]"   # ✅ บอกให้ใช้ order_id เท่านั้น
)

    shipping_address = relationship("ShippingAddress", back_populates="orders")

    # ฟังก์ชันช่วยอัปเดตสถานะออเดอร์ตาม tracking ล่าสุด
    def update_status_from_tracking(self):
        if not self.tracking_histories:
            return

        latest = sorted(self.tracking_histories, key=lambda t: t.current_time)[-1]
        self.order_text_status = latest.status_text

        if latest.status_code.name == "DELIVERED":
            self.order_status = "DELIVERED"
        elif latest.status_code.name in ("IN_TRANSIT", "OUT_FOR_DELIVERY"):
            self.order_status = "SHIPPED"
        elif latest.status_code.name == "FAILED":
            self.order_status = "FAILED"
