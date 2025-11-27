import json
from typing import Optional
import uuid

from fastapi import UploadFile
from sqlalchemy import and_
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.product import ImageType, Product, ProductImage, ProductVariant
from app.repositories import product_repository, store_repository
from app.utils.file_util import delete_file, save_multiple_files
from app.utils.response_handler import success_response, error_response

UPLOAD_DIR = "app/uploads/product/images"


def create_product_with_variants_service(
    db: Session,
    auth_user,
    data: dict,
):
    try:
        store = store_repository.get_store_by_user(db, auth_user.user_id)
        if not store:
            return error_response("ไม่พบร้านค้าของคุณ", {}, 403)

        variant_block = data.get("variant") or {}

        product = Product(
            store_id=store.store_id,
            product_name=data.get("product_name", "").strip(),
            base_price=data.get("base_price", 0),
            stock_quantity=data.get("stock_quantity", 0),
            # ชื่อหมวด (ภาษาไทย) ที่ใช้โชว์
            category=data.get("category", "").strip(),
            # slug / uuid ของหมวดหมู่ ใช้เป็น unique key
            category_id=data.get("category_id"),
            description=data.get("description", None),
            variant_name=variant_block.get("variant_name"),
            is_draft=False,
            is_active=True,
        )

        db.add(product)
        db.commit()
        db.refresh(product)

        # -------------------------
        # ผูกรูปภาพสินค้า (product images) จาก image_id → รูปของ product หลัก
        # -------------------------
        images_data = data.get("images", [])
        if images_data:
            try:
                for img_data in images_data:
                    img_id = img_data.get("image_id")
                    if not img_id:
                        continue

                    image: ProductImage | None = (
                        db.query(ProductImage)
                        .filter(ProductImage.image_id == img_id)
                        .first()
                    )
                    if not image:
                        continue

                    # รูปของ product หลัก → variant_id = None
                    image.product_id = product.product_id
                    image.variant_id = None
                    image.image_type = ImageType(
                        img_data.get("image_type", "NORMAL")
                    )
                    image.is_main = bool(img_data.get("is_main", False))
                    image.display_order = int(
                        img_data.get("display_order", 0)
                    )

                db.commit()
            except Exception as e:
                db.rollback()
                return error_response(
                    "ผูกภาพสินค้าล้มเหลว", {"error": str(e)}, 500
                )

        # -------------------------
        # สร้าง variant + ผูกรูปของแต่ละ option (จาก image_id)
        # -------------------------
        if variant_block and isinstance(variant_block, dict):
            options = variant_block.get("options") or []

            for opt in options:
                name = (opt.get("name_option") or "").strip()
                if not name:
                    continue

                variant = ProductVariant(
                    product_id=product.product_id,
                    size=None,
                    color=None,
                    name_option=name,
                    sku=f"{product.product_id}-{name}",
                    price=product.base_price
                    + float(opt.get("price_delta", 0)),
                    stock=int(opt.get("stock", 0)),
                    is_active=True,
                )
                db.add(variant)
                db.commit()
                db.refresh(variant)

                images_for_option = opt.get("images") or []
                for idx, img_data in enumerate(images_for_option):
                    img_id = img_data.get("image_id")
                    if not img_id:
                        continue

                    image: ProductImage | None = (
                        db.query(ProductImage)
                        .filter(ProductImage.image_id == img_id)
                        .first()
                    )
                    if not image:
                        continue

                    # รูปของ variant → มี variant_id
                    image.product_id = product.product_id
                    image.variant_id = variant.variant_id
                    image.image_type = ImageType(
                        img_data.get("image_type", "NORMAL")
                    )
                    image.is_main = bool(
                        img_data.get("is_main", idx == 0)
                    )
                    image.display_order = int(
                        img_data.get("display_order", idx)
                    )

                db.commit()

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
                    "stock_quantity": p.stock_quantity,
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


def update_product_service(
    db: Session,
    auth_user,
    product_id: str,
    data: dict,
):
    try:
        product: Product | None = product_repository.get_product_by_id(
            db, product_id
        )
        if not product:
            return error_response("ไม่พบสินค้า", {}, 404)

        # ✅ ตรวจว่าเป็นเจ้าของร้านจริงไหม
        store = store_repository.get_store_by_user(db, auth_user.user_id)
        if not store or store.store_id != product.store_id:
            return error_response("คุณไม่มีสิทธิ์แก้ไขสินค้านี้", {}, 403)

        # ─────────────────────────
        # อัปเดตข้อมูลหลักของสินค้า
        # ─────────────────────────
        product.product_name = data.get(
            "product_name", product.product_name
        )
        product.base_price = data.get("base_price", product.base_price)
        product.stock_quantity = data.get(
            "stock_quantity", product.stock_quantity
        )
        product.category = data.get("category", product.category)

        # รองรับ category_id ถ้า client ส่งมา
        if "category_id" in data:
            product.category_id = data.get(
                "category_id", product.category_id
            )

        product.description = data.get(
            "description", product.description
        )

        variant_block = data.get("variant")
        if isinstance(variant_block, dict):
            product.variant_name = variant_block.get(
                "variant_name", product.variant_name
            )

        db.commit()
        db.refresh(product)

        # ─────────────────────────
        # อัปเดตรูปของ Product หลัก จาก image_id
        # ─────────────────────────
        images_data = data.get("images") or []
        if images_data:
            payload_ids = {
                str(img["image_id"])
                for img in images_data
                if img.get("image_id")
            }

            existing_images: list[ProductImage] = (
                db.query(ProductImage)
                .filter(
                    ProductImage.product_id == product.product_id,
                    ProductImage.variant_id == None,
                )
                .all()
            )

            # ลบรูปที่ไม่ได้อยู่ใน payload แล้ว
            for img in existing_images:
                if str(img.image_id) not in payload_ids:
                    db.delete(img)

            db.commit()

            # update / ผูกรูปตาม payload
            for idx, img_data in enumerate(images_data):
                img_id = img_data.get("image_id")
                if not img_id:
                    continue

                image: ProductImage | None = (
                    db.query(ProductImage)
                    .filter(ProductImage.image_id == img_id)
                    .first()
                )
                if not image:
                    continue

                image.product_id = product.product_id
                image.variant_id = None
                image.image_type = ImageType(
                    img_data.get("image_type", "NORMAL")
                )
                image.is_main = bool(
                    img_data.get("is_main", idx == 0)
                )
                image.display_order = int(
                    img_data.get("display_order", idx)
                )

            db.commit()

        # ─────────────────────────
        # แทนที่ variant + รูปของแต่ละ option จาก image_id
        # ─────────────────────────
        if isinstance(variant_block, dict):
            options = variant_block.get("options") or []

            # ลบรูปของ variant เดิมทั้งหมด
            variant_ids_to_delete = [
                v.variant_id for v in product.variants
            ]
            if variant_ids_to_delete:
                db.query(ProductImage).filter(
                    ProductImage.variant_id.in_(
                        variant_ids_to_delete
                    )
                ).delete(synchronize_session=False)

            # ลบ variant เดิม
            for v in product.variants:
                db.delete(v)
            db.commit()

            base_price = product.base_price or 0

            print(options, "option in product")
            for opt in options:
                name = (opt.get("name_option") or "").strip()
                if not name:
                    continue

                price_delta = float(opt.get("price_delta", 0))
                stock = int(opt.get("stock", 0))

                variant = ProductVariant(
                    product_id=product.product_id,
                    size=None,
                    color=None,
                    name_option=name,  # <--- เพิ่มบรรทัดนี้เพื่อกำหนดค่าให้ name_option
                    sku=f"{product.product_id}-{name}",
                    price=base_price + price_delta,
                    stock=stock,
                    is_active=True,
                )
                db.add(variant)
                db.commit()
                db.refresh(variant)

                images_for_option = opt.get("images") or []
                for idx, img_data in enumerate(images_for_option):
                    img_id = img_data.get("image_id")
                    if not img_id:
                        continue

                    image: ProductImage | None = (
                        db.query(ProductImage)
                        .filter(ProductImage.image_id == img_id)
                        .first()
                    )
                    if not image:
                        continue

                    image.product_id = product.product_id
                    image.variant_id = variant.variant_id
                    image.image_type = ImageType(
                        img_data.get("image_type", "NORMAL")
                    )
                    image.is_main = bool(
                        img_data.get("is_main", idx == 0)
                    )
                    image.display_order = int(
                        img_data.get("display_order", idx)
                    )

                db.commit()

        return success_response(
            "อัปเดตสินค้าสำเร็จ",
            {"product_id": str(product.product_id)},
        )

    except Exception as e:
        db.rollback()
        return error_response(
            "อัปเดตสินค้าล้มเหลว", {"error": str(e)}, 500
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
