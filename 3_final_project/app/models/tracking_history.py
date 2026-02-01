# import enum
# from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, Enum
# from sqlalchemy.dialects.postgresql import UUID
# from sqlalchemy.orm import relationship
# from app.db.database import Base
# from app.utils.now_utc import now_utc
# import uuid


# # ────────────────────────────────
# # ENUM: สถานะของการติดตามพัสดุ
# # ────────────────────────────────
# class TrackingStatus(enum.Enum):
#     PENDING = "PENDING"          # พัสดุถูกสร้างในระบบ
#     PACKED = "PACKED"            # แพ็คของแล้ว
#     IN_TRANSIT = "IN_TRANSIT"    # ระหว่างการขนส่ง
#     ARRIVED = "ARRIVED"          # ถึงศูนย์กลาง/ปลายทาง
#     OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"  # ออกจัดส่ง
#     DELIVERED = "DELIVERED"      # จัดส่งสำเร็จ
#     FAILED = "FAILED"            # จัดส่งไม่สำเร็จ


# class TrackingHistory(Base):
#     __tablename__ = "tracking_histories"

#     tracking_history_id = Column(Integer, primary_key=True, autoincrement=True) #ใช้เล
#     order_id = Column(UUID(as_uuid=True), ForeignKey("orders.order_id"), nullable=False)
#     location_id = Column(Integer, ForeignKey("locations.location_id"), nullable=False)
#     tracking_number = Column(String, nullable=False)

#     status_code = Column(Enum(TrackingStatus, name="tracking_status_enum"), nullable=False)
#     status_text = Column(Text, nullable=False)   # ข้อความบรรยาย เช่น "ถึงศูนย์ขอนแก่น"
#     current_time = Column(DateTime, nullable=False, default=now_utc)

#     # ความสัมพันธ์
#     order = relationship(
#     "Order",
#     back_populates="tracking_histories",
#     foreign_keys=[order_id]   # ✅ ระบุ foreign key ฝั่งนี้ให้ตรงกัน
# )
#     location = relationship("Location", back_populates="tracking_histories")
