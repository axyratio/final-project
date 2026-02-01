# from sqlalchemy import Column, String, Text, Integer
# from sqlalchemy.orm import relationship
# from app.db.database import Base

# class Location(Base):
#     __tablename__ = "locations"

#     location_id = Column(Integer, primary_key=True, autoincrement=True)
#     location_name = Column(String(100), nullable=False)
#     location_type = Column(String(50), nullable=False)  # เช่น WAREHOUSE, BRANCH, HUB
#     address_detail = Column(Text, nullable=False)
#     zip_code_range = Column(String(50), nullable=True)

#     tracking_histories = relationship("TrackingHistory", back_populates="location")
