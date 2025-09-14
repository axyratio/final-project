from sqlalchemy import Column, Integer, String, TEXT, ForeignKey, Boolean, Date, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID
import uuid


class StoreApplication(Base):
    __tablename__ = 'store_applications'

    store_application_id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    status = Column(String, nullable=False, default="PENDING")
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    card_is_verified = Column(Boolean, nullable=False, default=False)
    mask_card_id = Column(String, nullable=True)
    birth_date = Column(Date, nullable=False)
    phone_number = Column(String, nullable=False)
    store_address = Column(TEXT, nullable=False)
    
    bank_account_name = Column(String, nullable=False)
    bank_account_number = Column(String, nullable=False)
    bank_name = Column(String, nullable=False)

    applied_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    reviewed_at = Column(DateTime(timezone=True), default=None)
    reviewed_by_at = Column(DateTime(timezone=True), default=None)
    reject_reason = Column(String, nullable=True)

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'))
    users = relationship("User", back_populates="store_applications")

