import enum
from sqlalchemy import Column, Float, Integer, String, TEXT, ForeignKey, Boolean, Date, DateTime
from sqlalchemy import Enum
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID
import uuid

# ENUM: สถานะของการชำระ
class PaymentStatus(enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    PROCESSING = "PROCESSING"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

# ────────────────────────────────────────────────
class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.order_id"), nullable=False)

    method_code = Column(String(50), ForeignKey("payment_methods.method_code"))   # จ่ายผ่านอะไร
    amount = Column(Float, nullable=False)
    status = Column(Enum(PaymentStatus, name="payment_status_enum"), default=PaymentStatus.PENDING)

    payment_intent_id = Column(String(100), nullable=True, unique=True)

    transaction_ref = Column(String(100), nullable=True)   # หมายเลขอ้างอิงจาก gateway/ธนาคาร
    bank_name = Column(String(50), nullable=True)          # สำหรับกรณีโอนธนาคาร
    slip_url = Column(String(255), nullable=True)          # URL สลิป (อัปโหลด)
    card_brand = Column(String(20), nullable=True)         # VISA, MASTERCARD
    masked_card_number = Column(String(20), nullable=True) # **** **** **** 1234
    paid_at = Column(DateTime, default=None)

    order = relationship("Order", back_populates="payment")
    payment_method = relationship("PaymentMethodMeta", back_populates="payments")
    


    