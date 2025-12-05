from app.db.database import Base
from sqlalchemy import (
    Column, Float, Integer, String, ForeignKey, DateTime, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.utils.now_utc import now_utc
import uuid


# ─────────────────────────────
# ตารางหลัก: ตะกร้าสินค้าของผู้ใช้
# ─────────────────────────────
class Cart(Base):
    __tablename__ = "carts"

    cart_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)

    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)
    is_active = Column(Boolean, default=True)  # เผื่อในอนาคตมีการ "archive" ตะกร้าเก่า

    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


# ─────────────────────────────
# ตารางย่อย: รายการสินค้าในตะกร้า
# ─────────────────────────────
class CartItem(Base):
    __tablename__ = "cart_items"

    cart_item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cart_id = Column(UUID(as_uuid=True), ForeignKey("carts.cart_id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id"), nullable=False)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.variant_id"), nullable=False) # อันนี้กูเพิ่มนะอาจจะต้องเปลี่ยน

    quantity = Column(Integer, nullable=False, default=1)
    added_at = Column(DateTime, default=now_utc)
    price_at_addition = Column(Float, nullable=False)  # เก็บราคาขณะใส่ตะกร้า (กันราคาปรับทีหลัง)

    cart = relationship("Cart", back_populates="items")
    variant = relationship("ProductVariant")

    @property
    def total_price(self):
        return self.quantity * self.price_at_addition
