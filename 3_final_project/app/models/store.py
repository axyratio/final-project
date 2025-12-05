import uuid
from sqlalchemy import TEXT, Boolean, Column, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc

class Store(Base):
    __tablename__ = 'stores'

    store_id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4) #กรอกเอาเองนะอันนี้ไม่ใช่ UUI ตอนจะค้นหาให้มันง่ายต่อการค้นหา

    name = Column(String, nullable=False)
    description = Column(TEXT, nullable=True)
    logo_path = Column(String, nullable=True)
    address = Column(TEXT, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    rating = Column(Float, nullable=True, default=0.0)
    # app/models/store.py
    stripe_account_id = Column(String, nullable=True)
    is_stripe_verified = Column(Boolean, nullable=False, default=False)

    # deleted_at = Column(DateTime(timezone=True), default=now_utc, nullable=False )

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), unique=True)
    products = relationship("Product", back_populates="store", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="store")
    order_items = relationship('OrderItem', back_populates='store')