import uuid
import enum
from sqlalchemy import Column, String, ForeignKey, DateTime, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
from app.utils.now_utc import now_utc


class NotificationType(enum.Enum):
    ORDER_RECEIVED = "ORDER_RECEIVED"
    ORDER_COMPLETED = "ORDER_COMPLETED"
    RETURN_REQUEST = "RETURN_REQUEST"
    LOW_STOCK = "LOW_STOCK"


class SellerNotification(Base):
    __tablename__ = 'seller_notifications'

    notification_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey('stores.store_id', ondelete='SET NULL'), nullable=True)

    type = Column(Enum(NotificationType, name="notification_type_enum"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id', ondelete='SET NULL'), nullable=True)

    is_read = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=now_utc)
    read_at = Column(DateTime(timezone=True), nullable=True)

    store = relationship("Store", backref="seller_notifications")
    order = relationship("Order", backref="seller_notifications")