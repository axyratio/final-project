from sqlalchemy import Column, Float, Integer, String, TEXT, ForeignKey, Boolean, Date, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID
import uuid

class OrderItem(Base):
    __tablename__ = 'order_items'
    order_item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey('stores.store_id'), nullable=False) #อยู่ในนี้เพราะจะได้สั่งหลายร้านใน order เดียว
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.product_id'), nullable=False)
    variant_id = Column(UUID(as_uuid=True), ForeignKey('product_variants.variant_id'), nullable=True)

    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    store = relationship("Store", back_populates="order_items")
    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")
    variant = relationship("ProductVariant")  # ถ้ามึงอยากให้มี