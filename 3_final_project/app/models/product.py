import enum
from app.db.database import Base
from sqlalchemy import Column, Float, Integer, String, TEXT, ForeignKey, Boolean, Date, DateTime
from sqlalchemy.orm import relationship
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy import Enum


class Product(Base):
    __tablename__ = 'products'
    product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(
    UUID(as_uuid=True),
    ForeignKey("stores.store_id", ondelete="CASCADE"),
    nullable=False
)
    category_id = Column(String(50), nullable=True)

    variant_name = Column(String(50), nullable=True)
    product_name = Column(String, nullable=False)
    base_price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, nullable=False)
    description = Column(TEXT, nullable=True)
    category = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_draft = Column(Boolean, default=True)

    average_rating = Column(Float, nullable=True, default=0.0)
    
    deleted_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    images = relationship(
        "ProductImage",
        primaryjoin="and_(Product.product_id == ProductImage.product_id, "
                    "ProductImage.variant_id == None)",
        lazy="joined",
        cascade="all, delete-orphan",
        back_populates="product"
    )

    store = relationship("Store", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    tryon_sessions = relationship("VTONSession", back_populates="product", cascade="all, delete-orphan")
    wishlists = relationship("Wishlist", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")



class ProductVariant(Base):
    __tablename__ = "product_variants"

    variant_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id"), nullable=False)

    color = Column(String(50), nullable=True)   # เช่น "ดำ", "ขาว"
    size = Column(String(20), nullable=True)    # เช่น "S", "M", "L"
    name_option = Column(String(100), nullable=False)
    sku = Column(String(100), nullable=False)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    # ควรจะมี variant name หรือ variant option เพื่อบอกว่ามันคือ ไซส์หรือสีแทนที่จะเป็น color กับ size นะ

    images = relationship(
        "ProductImage",
        primaryjoin="ProductVariant.variant_id == ProductImage.variant_id",
        lazy="joined",
        cascade="all, delete-orphan",
        back_populates="variant"
    )
    product = relationship("Product", back_populates="variants")
    tryon_sessions = relationship("VTONSession", back_populates="variant", cascade="all, delete-orphan")
# ─────────────────────────────
# ENUM: ประเภทของภาพสินค้า
# ─────────────────────────────
class ImageType(enum.Enum):
    NORMAL = "NORMAL"
    VTON = "VTON"


# ─────────────────────────────
# ตารางหลัก: สินค้า
# ─────────────────────────────
# class Product(Base):
#     __tablename__ = "products"

#     product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     store_id = Column(UUID(as_uuid=True), ForeignKey("stores.store_id"), nullable=False)

#     name = Column(String(200), nullable=False)
#     description = Column(TEXT, nullable=True)
#     category = Column(String(100), nullable=True)
#     price = Column(Float, nullable=False)
#     stock = Column(Integer, nullable=False, default=0)
#     is_active = Column(Boolean, default=True)



# # ─────────────────────────────
# # ตารางเก็บรูปภาพสินค้า
# # ─────────────────────────────
class ProductImage(Base):
    __tablename__ = "product_images"

    image_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id"), nullable=True)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.variant_id"), nullable=True)

    image_url = Column(String(255), nullable=False)   # URL ของรูปภาพ
    image_type = Column(Enum(ImageType, name="image_type_enum"), nullable=False, default=ImageType.NORMAL)
    display_order = Column(Integer, default=0)        # ลำดับการแสดงผล (สำหรับ gallery)

    uploaded_at = Column(DateTime, default=now_utc)
    is_main = Column(Boolean, default=False)          # ใช้ระบุว่าเป็นรูปหลักไหม

    product = relationship("Product", back_populates="images")
    variant = relationship("ProductVariant", back_populates="images")
    vton_meta = relationship("VTONMeta", back_populates="image", uselist=False, cascade="all, delete-orphan")
    


# ─────────────────────────────
# ตารางเสริม: metadata ของ VTON
# ─────────────────────────────
class VTONMeta(Base):
    __tablename__ = "vton_metadata"

    vton_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    image_id = Column(UUID(as_uuid=True), ForeignKey("product_images.image_id"), nullable=False, unique=True) #id สินค้าของ Product เพื่อ query

    pose_angle = Column(String(50), nullable=True)       # มุมถ่ายภาพ เช่น 'front', 'side'
    clothing_type = Column(String(50), nullable=True)    # ประเภทเสื้อผ้า เช่น 'tshirt', 'dress'
    segmentation_mask_url = Column(String(255), nullable=True)  # ไฟล์ mask สำหรับ AI
    model_used = Column(String(100), nullable=True)      # เช่น 'TryOn-GAN', 'VTON-HD'

    created_at = Column(DateTime, default=now_utc)

    image = relationship("ProductImage", back_populates="vton_meta")
    


class UserTryOnImage(Base):
    __tablename__ = "user_tryon_images"

    user_image_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)

    image_url = Column(String(255), nullable=False)  # path ของรูปผู้ใช้ที่อัปโหลด
    uploaded_at = Column(DateTime, default=now_utc)
    is_valid = Column(Boolean, default=True)         # true = ใช้งานได้ (ผ่านตรวจสอบ AI)

    user = relationship("User", back_populates="tryon_images")
    sessions = relationship("VTONSession", back_populates="user_image")


class VTONSession(Base):
    __tablename__ = "vton_sessions"

    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.variant_id"), nullable=True)  
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id"), nullable=False)
    user_image_id = Column(UUID(as_uuid=True), ForeignKey("user_tryon_images.user_image_id"), nullable=False)

    result_image_url = Column(String(255), nullable=True)  # ผลลัพธ์ของการลองเสื้อ
    model_used = Column(String(100), nullable=True)        # AI model ที่ใช้ เช่น 'TryOn-GAN'
    generated_at = Column(DateTime, default=now_utc)
    background_id = Column(UUID(as_uuid=True), ForeignKey("vton_backgrounds.background_id"), nullable=True)
    # ... (relationships เดิม) ...
    
    # [เพิ่ม Relationship นี้]
    background = relationship("VTONBackground", back_populates="sessions")
    user = relationship("User", back_populates="tryon_sessions")
    product = relationship("Product", back_populates="tryon_sessions")
    user_image = relationship("UserTryOnImage", back_populates="sessions")
    variant = relationship("ProductVariant", back_populates="tryon_sessions")
    # reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")


    