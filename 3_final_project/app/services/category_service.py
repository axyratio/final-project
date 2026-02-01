# File: app/services/category_service.py

from sqlalchemy.orm import Session
from app.models.category import Category
from app.models.product import Product
from app.repositories import category_repository
from app.utils.response_handler import success_response, error_response


def create_category_service(db: Session, data: dict):
    try:
        # ตรวจสอบ slug ซ้ำ
        existing = category_repository.get_category_by_slug(db, data.get("slug"))
        if existing:
            return error_response("Slug นี้มีอยู่แล้ว", {}, 400)
        
        category = Category(
            name=data.get("name"),
            slug=data.get("slug"),
            is_active=True
        )
        
        category = category_repository.create_category(db, category)
        
        return success_response(
            "สร้างหมวดหมู่สำเร็จ",
            {
                "category_id": str(category.category_id),
                "name": category.name,
                "slug": category.slug
            },
            201
        )
    except Exception as e:
        db.rollback()
        return error_response("เกิดข้อผิดพลาดขณะสร้างหมวดหมู่", {"error": str(e)}, 500)


# ลองแก้ใน app/services/category_service.py
def get_all_categories_service(db: Session, active_only: bool = True):
    try:
        # ลองเอา include_count ออก
        categories = category_repository.get_all_categories(
            db, 
            active_only=active_only
        )
        
        result = []
        for cat in categories:
            result.append({
                "category_id": str(cat.category_id),
                "name": cat.name,
                "slug": cat.slug,
                "is_active": cat.is_active,
                "product_count": 0, # ใส่ 0 ไปก่อนเพื่อทดสอบ
                "created_at": cat.created_at.isoformat() if cat.created_at else None,
                "updated_at": cat.updated_at.isoformat() if cat.updated_at else None
            })
        return success_response("ดึงหมวดหมู่ทั้งหมดสำเร็จ", result)
    except Exception as e:
        # พิมพ์ error ออกมาดูใน console ของ backend
        print(f"DEBUG ERROR: {str(e)}") 
        return error_response("เกิดข้อผิดพลาดขณะดึงหมวดหมู่", {"error": str(e)}, 500)

def get_category_by_id_service(db: Session, category_id: str):
    try:
        category = category_repository.get_category_by_id(db, category_id)
        if not category:
            return error_response("ไม่พบหมวดหมู่", {}, 404)
        
        product_count = db.query(Product).filter(
            Product.category_id == category.category_id,
            Product.is_active == True
        ).count()
        
        return success_response("ดึงข้อมูลหมวดหมู่สำเร็จ", {
            "category_id": str(category.category_id),
            "name": category.name,
            "slug": category.slug,
            "is_active": category.is_active,
            "product_count": product_count,
            "created_at": category.created_at.isoformat() if category.created_at else None,
            "updated_at": category.updated_at.isoformat() if category.updated_at else None
        })
    except Exception as e:
        return error_response("เกิดข้อผิดพลาดขณะดึงหมวดหมู่", {"error": str(e)}, 500)


def update_category_service(db: Session, category_id: str, data: dict):
    try:
        category = category_repository.get_category_by_id(db, category_id)
        if not category:
            return error_response("ไม่พบหมวดหมู่", {}, 404)
        
        # ตรวจสอบ slug ซ้ำ (ถ้ามีการเปลี่ยน)
        new_slug = data.get("slug")
        if new_slug and new_slug != category.slug:
            existing = category_repository.get_category_by_slug(db, new_slug)
            if existing:
                return error_response("Slug นี้มีอยู่แล้ว", {}, 400)
        
        # อัพเดทข้อมูล
        if "name" in data:
            category.name = data["name"]
        if "slug" in data:
            category.slug = data["slug"]
        if "is_active" in data:
            category.is_active = data["is_active"]
        
        category = category_repository.update_category(db, category)
        
        return success_response("อัพเดทหมวดหมู่สำเร็จ", {
            "category_id": str(category.category_id),
            "name": category.name,
            "slug": category.slug
        })
    except Exception as e:
        db.rollback()
        return error_response("เกิดข้อผิดพลาดขณะอัพเดทหมวดหมู่", {"error": str(e)}, 500)


def delete_category_service(db: Session, category_id: str, hard_delete: bool = False):
    try:
        category = category_repository.get_category_by_id(db, category_id)
        if not category:
            return error_response("ไม่พบหมวดหมู่", {}, 404)
        
        # ตรวจสอบจำนวนสินค้า (จุดที่เกิด Error)
        # แก้ไขโดยการใช้ str(category.category_id) เพื่อให้เป็นประเภท String เหมือนใน DB
        product_count = db.query(Product).filter(
            Product.category_id == str(category.category_id), 
            Product.is_active == True
        ).count()
        
        if product_count > 0 and hard_delete:
            return error_response(
                f"ไม่สามารถลบได้ มีสินค้า {product_count} รายการใช้หมวดหมู่นี้อยู่",
                {"product_count": product_count},
                400
            )
        
        if hard_delete:
            category_repository.hard_delete_category(db, category)
            message = "ลบหมวดหมู่ถาวรสำเร็จ"
        else:
            category_repository.delete_category(db, category)
            message = "ปิดการใช้งานหมวดหมู่สำเร็จ"
        
        return success_response(message, {"category_id": str(category_id)})
    except Exception as e:
        db.rollback()
        return error_response("เกิดข้อผิดพลาดขณะลบหมวดหมู่", {"error": str(e)}, 500)