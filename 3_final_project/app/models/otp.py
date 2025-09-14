# # app/models/otp.py
# from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
# from sqlalchemy.dialects.postgresql import UUID
# import uuid
# from sqlalchemy.orm import relationship
# from app.db.database import Base
# from app.utils.now_utc import now_utc

# class Otp(Base):
#     __tablename__ = 'otps'
    
#     otp_id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
#     otp_code = Column(String, nullable=False)  # สามารถเก็บแบบ hash
#     purpose = Column(String, nullable=False)   # เช่น email_verification
#     is_delete = Column(Boolean, default=False)
#     verified_at = Column(DateTime(timezone=True), default=None)
#     created_at = Column(DateTime(timezone=True), default=now_utc)
#     expires_at = Column(DateTime(timezone=True), default=now_utc)

#     user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'))
#     user = relationship("User", back_populates="otps")
