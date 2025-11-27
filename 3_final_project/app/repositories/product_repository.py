from typing import Optional
import uuid
from sqlalchemy import UUID
from sqlalchemy.orm import Session, joinedload
from app.models.product import Product, ProductVariant, ProductImage, VTONMeta, VTONSession

def create_draft_product(db, store_id):
    new_product = Product(
        product_id=uuid.uuid4(),
        store_id=store_id,
        product_name="",
        base_price=0.0,
        stock_quantity=0,
        category="uncategorized",  # ใส่ค่าชั่วคราวให้ไม่เป็น null
        description="",
        is_draft=True,
        is_active=False,  # ปิดการแสดงผลในหน้า store จนกว่าจะ complete
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

def get_all_products(db: Session):
    return (
        db.query(Product)
        .options(
            joinedload(Product.images).joinedload(ProductImage.vton_meta),
            joinedload(Product.variants).joinedload(ProductVariant.images).joinedload(ProductImage.vton_meta)
        )
        .filter(Product.is_active.is_(True))
        .all()
    )


# ✅ ดึงสินค้าแบบละเอียดตาม product_id (รวม variants, images, vton_meta)
def get_product_by_id(db: Session, product_id):
    return (
        db.query(Product)
        .options(
            joinedload(Product.images).joinedload(ProductImage.vton_meta),
            joinedload(Product.variants).joinedload(ProductVariant.images).joinedload(ProductImage.vton_meta)
        )
        .filter(Product.product_id == product_id)
        .first()
    )

def create_product(db: Session, product: Product):
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

def update_product(db: Session, product: Product):
    db.commit()
    db.refresh(product)
    return product

def delete_product(db: Session, product: Product):
    product.is_active = False
    db.commit()



# ======= api

def get_product_detail(db: Session, product_id: UUID) -> Optional[Product]:
  q = (
      db.query(Product)
      .options(
          joinedload(Product.images),
          joinedload(Product.variants).joinedload(ProductVariant.images),
          joinedload(Product.reviews),
          joinedload(Product.store),
      )
      .filter(Product.product_id == product_id, Product.is_active == True)
  )
  return q.first()
