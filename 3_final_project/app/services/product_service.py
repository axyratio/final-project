# app/services/product_service.py
# ✅ แก้ไข: ไม่ลบรูปเก่าทั้งหมด แต่ให้ UPDATE เฉพาะรูปที่เปลี่ยน

import json
from typing import Optional
import uuid
import time

from fastapi import UploadFile
from sqlalchemy import and_
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.models.product import ImageType, Product, ProductImage, ProductVariant
from app.repositories import product_repository, store_repository
from app.utils.file_util import delete_file, save_multiple_files
from app.utils.response_handler import success_response, error_response

UPLOAD_DIR = "app/uploads/product/images"


# ✅ เพิ่ม helper function สำหรับผูกรูปอย่างปลอดภัย
def safely_bind_images(
    db: Session,
    images_data: list[dict],
    product_id: uuid.UUID,
    variant_id: Optional[uuid.UUID] = None,
    max_retries: int = 3
) -> None:
    """
    ผูกรูปภาพอย่างปลอดภัย พร้อม retry mechanism และ row locking
    
    Args:
        db: Database session
        images_data: List of image data dicts with image_id
        product_id: Product UUID to bind images to
        variant_id: Optional variant UUID (None = product main images)
        max_retries: Maximum retry attempts on failure
    """
    for img_data in images_data:
        img_id = img_data.get("image_id")
        if not img_id:
            print(f"⚠️ Skipping image with no image_id: {img_data}")
            continue

        retry_count = 0
        while retry_count < max_retries:
            try:
                # ✅ ใช้ with_for_update() เพื่อ lock row ป้องกัน race condition
                image: ProductImage | None = (
                    db.query(ProductImage)
                    .filter(ProductImage.image_id == img_id)
                    .with_for_update()
                    .first()
                )
                
                if not image:
                    print(f"⚠️ Image {img_id} not found in database")
                    print(f"   - This might be a deleted image or invalid image_id")
                    break

                # ✅ ผูกข้อมูลรูปภาพ
                image.product_id = product_id
                image.variant_id = variant_id
                image.image_type = ImageType(img_data.get("image_type", "NORMAL"))
                image.is_main = bool(img_data.get("is_main", False))
                image.display_order = int(img_data.get("display_order", 0))
                
                db.add(image)
                db.flush()  # ✅ flush ทันทีเพื่อ detect errors
                print(f"✅ Successfully bound image {img_id} to variant {variant_id}")
                break  # สำเร็จ ออกจาก retry loop
                
            except IntegrityError as e:
                retry_count += 1
                db.rollback()
                print(f"⚠️ Integrity error, retry {retry_count}/{max_retries} for image {img_id}: {str(e)}")
                
                if retry_count >= max_retries:
                    print(f"❌ Failed to bind image {img_id} after {max_retries} retries")
                    raise
                
                # Exponential backoff
                time.sleep(0.1 * retry_count)
                
            except Exception as e:
                print(f"❌ Unexpected error binding image {img_id}: {str(e)}")
                db.rollback()
                raise

    # ✅ Commit หลังผูกรูปทั้งหมดสำเร็จ
    db.commit()


def create_product_with_variants_service(
    db: Session,
    user_data,
    data: dict,
):
    try:
        store = store_repository.get_store_by_user(db, user_data.user_id)
        if not store:
            return error_response("ไม่พบร้านค้าของคุณ", {}, 403)

        variant_block = data.get("variant") or {}
        print(f"[PRODUCT] varaitn data", data.get(""))

        product = Product(
            store_id=store.store_id,
            product_name=data.get("product_name", "").strip(),
            base_price=data.get("base_price", 0),
            category_id=data.get("category_id"),  # ✅ เพิ่มบรรทัดนี้
            category=data.get("category", "").strip(),  # เก็บไว้สำหรับ backward compatibility
            description=data.get("description", None),
            variant_name=variant_block.get("variant_name"),
            is_draft=False,
            is_active=True,
        )

        db.add(product)
        db.commit()
        db.refresh(product)

        # ✅ ผูกรูปภาพสินค้าหลักด้วย safely_bind_images
        images_data = data.get("images", [])
        if images_data:
            try:
                safely_bind_images(
                    db=db,
                    images_data=images_data,
                    product_id=product.product_id,
                    variant_id=None
                )
            except Exception as e:
                db.rollback()
                return error_response(
                    "ผูกภาพสินค้าล้มเหลว", {"error": str(e)}, 500
                )

        # ✅ สร้าง variant + คำนวณราคาเต็ม (base_price + price_delta)
        if variant_block and isinstance(variant_block, dict):
            options = variant_block.get("options") or []
            base_price = product.base_price or 0

            for opt in options:
                name = (opt.get("name_option") or "").strip()
                if not name:
                    continue

                price_delta = float(opt.get("price_delta", 0))
                
                # ✅ FIX: คำนวณราคาเต็ม = base_price + price_delta
                final_price = price_delta
                
                print(f"🔢 Creating variant: {name}")
                print(f"   base_price: {base_price}")
                print(f"   price_delta: {price_delta}")
                print(f"   final_price: {final_price}")

                variant = ProductVariant(
                    product_id=product.product_id,
                    size=None,
                    color=None,
                    name_option=name,
                    sku=f"{product.product_id}-{name}",
                    price=final_price,  # ✅ ใช้ราคาเต็มที่คำนวณแล้ว
                    stock=int(opt.get("stock", 0)),
                    is_active=True,
                )
                db.add(variant)
                db.commit()
                db.refresh(variant)

                # ✅ ผูกรูปของ variant ด้วย safely_bind_images
                images_for_option = opt.get("images") or []
                if images_for_option:
                    print(f"🎨 Binding {len(images_for_option)} images to variant '{name}'")
                    try:
                        safely_bind_images(
                            db=db,
                            images_data=images_for_option,
                            product_id=product.product_id,
                            variant_id=variant.variant_id
                        )
                    except Exception as e:
                        db.rollback()
                        return error_response(
                            f"ผูกภาพ variant '{name}' ล้มเหลว",
                            {"error": str(e)},
                            500
                        )

        return success_response(
            "สร้างสินค้าและตัวเลือกสำเร็จ",
            {"product_id": str(product.product_id)},
            201,
        )

    except Exception as e:
        db.rollback()
        return error_response(
            "เกิดข้อผิดพลาดขณะสร้างสินค้า", {"error": str(e)}, 500
        )



def get_all_products_service(db: Session):
    """
    ดึง list สินค้าทั้งหมด + รูปหลัก 1 รูป/สินค้า
    แก้ให้ไม่ดึงรูปของ variant มาปน → กันปัญหา product ซ้ำ
    """
    try:
        rows = (
            db.query(Product, ProductImage)
            .outerjoin(
                ProductImage,
                and_(
                    Product.product_id == ProductImage.product_id,
                    # ✅ เอาเฉพาะรูปของ product หลัก
                    ProductImage.variant_id == None,
                    # ✅ ใช้เฉพาะรูปหลัก
                    ProductImage.is_main == True,
                    # ✅ กันกรณี VTON เผลอ mark main
                    ProductImage.image_type == ImageType.NORMAL,
                ),
            )
            .filter(Product.is_active == True, Product.is_draft == False)
            .order_by(Product.created_at.desc())
            .all()
        )

        products = []
        for p, img in rows:
            products.append(
                {
                    "product_id": str(p.product_id),
                    "product_name": p.product_name,
                    "base_price": p.base_price,
                    "category": p.category,
                    "category_id": p.category_id,
                    "average_rating": p.average_rating or 0,
                    "image_id": str(img.image_id) if img else None,
                    "image_url": img.image_url if img else None,
                }
            )

        return success_response("ดึงสินค้าทั้งหมดสำเร็จ", products)
    except Exception as e:
        return error_response(
            "เกิดข้อผิดพลาดขณะดึงข้อมูล", {"error": str(e)}, 500
        )


def get_product_by_id_service(db: Session, product_id: str):
    try:
        product = product_repository.get_product_by_id(db, product_id)
        if not product:
            return error_response("ไม่พบสินค้า", {}, 404)
        return success_response("ดึงข้อมูลสินค้าสำเร็จ", product)
    except Exception as e:
        return error_response(
            "เกิดข้อผิดพลาดขณะดึงข้อมูล", {"error": str(e)}, 500
        )


# ✅ แก้ไข update_product_service - UPDATE รูปแบบ SMART (ไม่ลบทั้งหมด)

def update_product_service(
    db: Session,
    user_data,
    product_id: str,
    data: dict,
):
    try:
        product: Product | None = product_repository.get_product_by_id(
            db, product_id
        )
        if not product:
            return error_response("ไม่พบสินค้า", {}, 404)

        store = store_repository.get_store_by_user(db, user_data.user_id)
        if not store or store.store_id != product.store_id:
            return error_response("คุณไม่มีสิทธิ์แก้ไขสินค้านี้", {}, 403)

        # อัปเดตข้อมูลหลักของสินค้า
        product.product_name = data.get("product_name", product.product_name)
        product.base_price = data.get("base_price", product.base_price)
        product.category = data.get("category", product.category)

        if "category_id" in data:
            product.category_id = data.get("category_id", product.category_id)
            
        if "category" in data:
            product.category = data.get("category", product.category)

        product.description = data.get("description", product.description)

        variant_block = data.get("variant")
        if isinstance(variant_block, dict):
            product.variant_name = variant_block.get(
                "variant_name", product.variant_name
            )

        db.commit()
        db.refresh(product)

        # ✅ อัปเดตรูปของ Product หลัก
        images_data = data.get("images", [])
        if images_data:
            try:
                payload_ids = {
                    str(img["image_id"]) for img in images_data if img.get("image_id")
                }

                existing_images: list[ProductImage] = (
                    db.query(ProductImage)
                    .filter(
                        ProductImage.product_id == product.product_id,
                        ProductImage.variant_id == None,
                    )
                    .all()
                )

                # ลบรูปที่ไม่อยู่ใน payload
                for img in existing_images:
                    if str(img.image_id) not in payload_ids:
                        print(f"🗑️ Deleting product image: {img.image_id}")
                        db.delete(img)
                db.commit()

                # ✅ ผูกรูปใหม่ด้วย safely_bind_images
                safely_bind_images(
                    db=db,
                    images_data=images_data,
                    product_id=product.product_id,
                    variant_id=None
                )

            except Exception as e:
                db.rollback()
                return error_response("ผูกภาพสินค้าล้มเหลว", {"error": str(e)}, 500)

        # ✅ UPDATE variant แบบ SMART - ไม่ลบรูปทั้งหมด
        if isinstance(variant_block, dict):
            options = variant_block.get("options") or []
            base_price = product.base_price or 0

            # ✅ สร้าง map ของ variant เดิม
            existing_variants_map = {
                str(v.variant_id): v for v in product.variants
            }
            
            # ✅ สร้าง set ของ variant_id ที่มาจาก payload
            payload_variant_ids = set()
            
            print(f"📦 Processing {len(options)} variants")
            
            for opt in options:
                name = (opt.get("name_option") or "").strip()
                if not name:
                    continue

                price_delta = float(opt.get("price_delta", 0))
                stock = int(opt.get("stock", 0))
                
                # ✅ FIX: คำนวณราคาเต็ม = base_price + price_delta
                final_price = price_delta
                
                print(f"🔢 Processing variant: {name}")
                print(f"   base_price: {base_price}")
                print(f"   price_delta: {price_delta}")
                print(f"   final_price: {final_price}")

                # ✅ ตรวจสอบว่ามี variant_id เดิมหรือไม่
                variant_id = opt.get("variant_id")
                
                if variant_id and str(variant_id) in existing_variants_map:
                    # ✅ UPDATE variant เดิม
                    variant = existing_variants_map[str(variant_id)]
                    variant.name_option = name
                    variant.price = final_price  # ✅ ใช้ราคาเต็ม
                    variant.stock = stock
                    variant.sku = f"{product.product_id}-{name}"
                    
                    print(f"♻️ Updated existing variant: {variant_id}")
                    payload_variant_ids.add(str(variant_id))
                    
                else:
                    # ✅ สร้าง variant ใหม่
                    variant = ProductVariant(
                        product_id=product.product_id,
                        size=None,
                        color=None,
                        name_option=name,
                        sku=f"{product.product_id}-{name}",
                        price=final_price,  # ✅ ใช้ราคาเต็ม
                        stock=stock,
                        is_active=True,
                    )
                    db.add(variant)
                    db.flush()
                    db.refresh(variant)
                    
                    print(f"✨ Created new variant: {variant.variant_id}")
                    payload_variant_ids.add(str(variant.variant_id))

                # ✅ อัปเดตรูปของ variant แบบ SMART (ไม่ลบทั้งหมด)
                images_for_option = opt.get("images") or []
                print(f"🎨 Variant '{name}' has {len(images_for_option)} images in payload")
                
                if images_for_option:
                    try:
                        # ✅ ดึงรูปเดิมของ variant นี้
                        existing_variant_images = (
                            db.query(ProductImage)
                            .filter(ProductImage.variant_id == variant.variant_id)
                            .all()
                        )
                        
                        print(f"📸 Existing images for variant '{name}': {len(existing_variant_images)}")
                        for img in existing_variant_images:
                            print(f"   - {img.image_id} ({img.image_type})")
                        
                        # ✅ สร้าง set ของ image_id จาก payload
                        payload_image_ids = {
                            str(img["image_id"]) for img in images_for_option if img.get("image_id")
                        }
                        
                        print(f"📤 Payload image IDs: {payload_image_ids}")
                        
                        # ✅ ลบเฉพาะรูปที่ไม่อยู่ใน payload
                        for img in existing_variant_images:
                            if str(img.image_id) not in payload_image_ids:
                                print(f"🗑️ Deleting variant image: {img.image_id} ({img.image_type})")
                                db.delete(img)
                        
                        db.commit()
                        
                        # ✅ ผูกรูปใหม่ (เฉพาะรูปที่มีใน payload)
                        print(f"🔗 Binding {len(images_for_option)} images to variant '{name}'")
                        safely_bind_images(
                            db=db,
                            images_data=images_for_option,
                            product_id=product.product_id,
                            variant_id=variant.variant_id
                        )
                        
                    except Exception as e:
                        db.rollback()
                        print(f"❌ Error updating variant images: {str(e)}")
                        return error_response(
                            f"ผูกภาพ variant '{name}' ล้มเหลว",
                            {"error": str(e)},
                            500
                        )
                else:
                    print(f"⚠️ No images in payload for variant '{name}' - keeping existing images")

            # ✅ ลบ variant ที่ไม่อยู่ใน payload
            for variant_id, variant in existing_variants_map.items():
                if variant_id not in payload_variant_ids:
                    print(f"🗑️ Deleting variant: {variant_id}")
                    
                    # ลบรูปของ variant นี้
                    db.query(ProductImage).filter(
                        ProductImage.variant_id == variant.variant_id
                    ).delete(synchronize_session='fetch')
                    
                    # ลบ variant
                    db.delete(variant)
            
            db.commit()
            print(f"💾 Committed all changes successfully")

        return success_response(
            "อัปเดตสินค้าสำเร็จ",
            {"product_id": str(product.product_id)},
        )

    except Exception as e:
        db.rollback()
        print(f"❌ Error in update_product_service: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(
            "เกิดข้อผิดพลาดขณะอัปเดตสินค้า",
            {"error": str(e)},
            500
        )

def delete_product_service(db: Session, product_id: str):
    try:
        product = product_repository.get_product_by_id(db, product_id)
        if not product:
            return error_response("ไม่พบสินค้า", {}, 404)
        product.is_active = False
        db.commit()
        return success_response("ปิดการขายสินค้าสำเร็จ")
    except SQLAlchemyError as e:
        db.rollback()
        return error_response(
            "เกิดข้อผิดพลาดในฐานข้อมูล", {"error": str(e)}, 500
        )
        
        
# ==================== ปิดการขาย


def close_sale_product_service(db, user_data, product_id: str):
    product = product_repository.get_product_by_id(db, product_id)
    if not product:
        return error_response("ไม่พบสินค้า", status_code=404)

    store = store_repository.get_store_by_user(db, user_data.user_id)
    if not store or store.store_id != product.store_id:
        return error_response("คุณไม่มีสิทธิ์ปิดการขายสินค้านี้", status_code=403)

    product.is_active = False
    db.commit()
    return success_response("ปิดการขายสินค้าสำเร็จ", {"product_id": str(product.product_id)})


def open_sale_product_service(db, user_data, product_id: str):
    product = product_repository.get_product_by_id(db, product_id)
    if not product:
        return error_response("ไม่พบสินค้า", status_code=404)

    store = store_repository.get_store_by_user(db, user_data.user_id)
    if not store or store.store_id != product.store_id:
        return error_response("คุณไม่มีสิทธิ์เปิดการขายสินค้านี้", status_code=403)

    product.is_active = True
    db.commit()
    return success_response("เปิดการขายสินค้าสำเร็จ", {"product_id": str(product.product_id)})