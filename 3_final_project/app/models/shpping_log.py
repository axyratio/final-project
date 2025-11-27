from sqlalchemy import Column, Integer, String, TEXT, ForeignKey, Boolean, Date, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID
import uuid

class ShippingLog(Base):
    __tablename__ = 'shipping_logs'

    shipping_log_id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    status = Column(String, nullable=False)

    updated_by = Column(String, nullable=False)

    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'))
    order = relationship('Order', back_populates='shipping_logs')