from sqlalchemy import Column, Integer, String, TEXT, ForeignKey, Boolean, Date, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID
import uuid


class StoreApplication(Base):
    __tablename__ = 'store_applications'

    store_application_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)

    status = Column(String, nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    birth_date = Column(Date, nullable=False)
    phone_number = Column(String, nullable=False)
    store_address = Column(TEXT, nullable=False)
    
    # บัตรประชาชน
    card_is_verified = Column(Boolean, nullable=False, default=False)
    hmac_card_id = Column(String, nullable=False)
    mask_card_id = Column(String, nullable=False)

    # ธนาคาร
    bank_account_name = Column(String, nullable=False)
    bank_account_number = Column(String, nullable=False)
    bank_name = Column(String, nullable=False)

    # Audit fields
    applied_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    rejected_reason = Column(TEXT, nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    users = relationship("User", back_populates="store_applications")

