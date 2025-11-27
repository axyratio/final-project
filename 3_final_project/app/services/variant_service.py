import uuid
from fastapi import UploadFile
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.models.product import ProductVariant, ProductImage
from app.repositories import variant_repository, product_repository
from app.utils.file_util import save_multiple_files, update_file
from app.utils.response_handler import success_response, error_response

UPLOAD_DIR = "app/uploads/product/images"

def create_variant_service(db: Session, product_id: str, data: dict, image_file: UploadFile = None):
    try:
        product = product_repository.get_product_by_id(db, product_id)
        print(product_id, "ไอสินค้า")
        if not product:
            return error_response("ไม่พบสินค้า", {}, 404)

        variant = ProductVariant(
            product_id=product_id,
            color=data.get("color"),
            size=data.get("size"),
            sku=data.get("sku"),
            price=data.get("price", 0),
            stock=data.get("stock", 0),
            is_active=True
        )
        db.add(variant)
        db.commit()
        db.refresh(variant)

        if image_file:
            path = save_multiple_files(UPLOAD_DIR, [image_file])[0]
            db.add(ProductImage(
                product_id=product_id,
                variant_id=variant.variant_id,
                image_url="/" + path,
                is_main=True
            ))
            db.commit()

        return success_response("สร้าง Variant สำเร็จ", {"variant_id": str(variant.variant_id)})
    except SQLAlchemyError as e:
        db.rollback()
        return error_response("เกิดข้อผิดพลาดในฐานข้อมูล", {"error": str(e)}, 500)


def get_all_variants_service(db: Session):
    try:
        variants = variant_repository.get_all_variants(db)
        return success_response("ดึง Variant ทั้งหมดสำเร็จ", variants)
    except Exception as e:
        return error_response("เกิดข้อผิดพลาดขณะดึงข้อมูล", {"error": str(e)}, 500)


def get_variant_by_id_service(db: Session, variant_id: str):
    try:
        variant = variant_repository.get_variant_by_id(db, variant_id)
        if not variant:
            return error_response("ไม่พบ Variant", {}, 404)
        return success_response("ดึงข้อมูล Variant สำเร็จ", variant)
    except Exception as e:
        return error_response("เกิดข้อผิดพลาดขณะดึงข้อมูล", {"error": str(e)}, 500)


def update_variant_service(db: Session, variant_id: str, data: dict, image_file: UploadFile = None):
    try:
        # ✅ ตรวจสอบว่า variant_id เป็น UUID ที่ถูกต้องไหม
        try:
            variant_uuid = uuid.UUID(str(variant_id).strip())
        except (ValueError, AttributeError):
            return error_response("รหัส Variant ไม่ถูกต้อง", {"variant_id": variant_id}, 400)

        # ✅ ดึง variant จากฐานข้อมูล
        variant = variant_repository.get_variant_by_id(db, variant_uuid)
        if not variant:
            return error_response("ไม่พบ Variant", {}, 404)

        # ✅ อัปเดตข้อมูล variant
        for key, value in data.items():
            if hasattr(variant, key) and value is not None:
                setattr(variant, key, value)

        # ✅ ถ้ามีการอัปโหลดรูปภาพใหม่
        if image_file:
            if variant.images:
                old_image = variant.images[0]
                new_path = update_file(old_image.image_url, UPLOAD_DIR, image_file)
                old_image.image_url = new_path
            else:
                path = save_multiple_files(UPLOAD_DIR, [image_file])[0]
                db.add(ProductImage(
                    product_id=variant.product_id,
                    variant_id=variant.variant_id,
                    image_url="/" + path,
                    is_main=True
                ))

        db.commit()
        db.refresh(variant)

        return success_response("อัปเดต Variant สำเร็จ", {
            "variant_id": str(variant.variant_id),
            "product_id": str(variant.product_id),
            "color": variant.color,
            "size": variant.size,
            "sku": variant.sku,
            "price": variant.price,
            "stock": variant.stock,
            "is_active": variant.is_active
        })

    except SQLAlchemyError as e:
        db.rollback()
        return error_response("เกิดข้อผิดพลาดในฐานข้อมูล", {"error": str(e)}, 500)

    except Exception as e:
        db.rollback()
        return error_response("เกิดข้อผิดพลาดภายในระบบ", {"error": str(e)}, 500)


def delete_variant_service(db: Session, variant_id: str):
    try:
        variant = variant_repository.get_variant_by_id(db, variant_id)
        if not variant:
            return error_response("ไม่พบ Variant", {}, 404)
        variant.is_active = False
        db.commit()
        return success_response("ปิดการขาย Variant สำเร็จ")
    except SQLAlchemyError as e:
        db.rollback()
        return error_response("เกิดข้อผิดพลาดในฐานข้อมูล", {"error": str(e)}, 500)
