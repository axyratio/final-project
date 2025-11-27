# from sqlalchemy import Column, Integer, String, TEXT, ForeignKey, Boolean, Date, DateTime
# from sqlalchemy.orm import relationship
# from app.db.database import Base
# from app.utils.now_utc import now_utc
# from sqlalchemy.dialects.postgresql import UUID
# import uuid

# class ShippingBranch(Base):
#     __tablename__ = "shipping_branches"
#     branch_id = Column(Integer, primary_key=True, autoincrement=True)
#     name = Column(String(100), nullable=False)
#     province = Column(String(100), nullable=False)
#     address = Column(TEXT, nullable=False)
#     phone_number = Column(String(20), nullable=True)

#     orders = relationship("Order", back_populates="shipping_branch")