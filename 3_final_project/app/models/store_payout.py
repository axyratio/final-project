# # app/models/store_payout.py
# from sqlalchemy import Column, Float, String, DateTime, ForeignKey, Boolean
# from sqlalchemy.dialects.postgresql import UUID
# from sqlalchemy.orm import relationship
# from app.db.database import Base
# from app.utils.now_utc import now_utc
# import uuid

# class StorePayout(Base):
#     __tablename__ = "store_payouts"

#     payout_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     store_id = Column(UUID(as_uuid=True), ForeignKey("stores.store_id"), nullable=False)
#     order_id = Column(UUID(as_uuid=True), ForeignKey("orders.order_id"), nullable=False)
#     payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.payment_id"), nullable=False)

#     amount = Column(Float, nullable=False)  # จำนวนเงินที่โอนไปให้ร้าน (หลังหักค่า platform fee แล้ว)
#     platform_fee = Column(Float, nullable=False, default=0.0)

#     stripe_transfer_id = Column(String(100), nullable=True)  # id ของ stripe.Transfer
#     currency = Column(String(10), nullable=False, default="thb")

#     status = Column(String(20), nullable=False, default="PENDING") # PENDING / SUCCESS / FAILED
#     created_at = Column(DateTime(timezone=True), default=now_utc)
#     paid_at = Column(DateTime(timezone=True), nullable=True)

#     store = relationship("Store")
#     order = relationship("Order")
#     payment = relationship("Payment")
