import enum
from sqlalchemy import Column, Float, Integer, String, TEXT, ForeignKey, Boolean, Date, DateTime
from sqlalchemy import Enum
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Review(Base):
    __tablename__ = "reviews"
    review_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(TEXT, nullable=True)
    created_at = Column(DateTime, default=now_utc)

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
    
    # --- ADD THIS LINE ---
    images = relationship("ReviewImage", back_populates="review", cascade="all, delete-orphan")
# ยังไม่ได้ทำ ERD

class ReviewImage(Base):
    __tablename__ = "review_images"
    review_image_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id = Column(UUID(as_uuid=True), ForeignKey("reviews.review_id"), nullable=False)
    
    # เปลี่ยนจาก ForeignKey เป็น String เพื่อเก็บ URL ของรูปภาพโดยตรง
    image_url = Column(String, nullable=False) 
    
    created_at = Column(DateTime, default=now_utc)

    review = relationship("Review", back_populates="images")