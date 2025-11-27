# app/models/shipping_address.py
import uuid
from sqlalchemy import Column, ForeignKey, String, TEXT, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
from app.utils.now_utc import now_utc
from sqlalchemy.orm import relationship

class ShippingAddress(Base):
    __tablename__ = "shipping_addresses"

    ship_addr_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    full_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    address_line = Column(String, nullable=False)
    province = Column(String, nullable=False)
    district = Column(String, nullable=False)
    sub_district = Column(String, nullable=False)
    postal_code = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # ✅ ความสัมพันธ์กับ User
    user = relationship("User", back_populates="shipping_addresses")

    # ✅ ความสัมพันธ์กับ Order (1 ที่อยู่จัดส่งอาจมีหลายออเดอร์ที่ใช้)
    orders = relationship("Order", back_populates="shipping_address")