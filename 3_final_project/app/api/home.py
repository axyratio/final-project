from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional

from app.db.database import get_db
from app.models.product import ImageType, Product, ProductImage
from app.models.category import Category
from app.models.store import Store
from app.models.user import User
from app.utils.response_handler import success_response, error_response
from app.core.authz import get_current_user_from_cookie

router = APIRouter(prefix="/home", tags=["Home"])

# =========================
# TYPES (for reference)
# =========================
# export type HomeBanner = {
#   id: string;
#   title: string;
#   subtitle?: string;
#   buttonLabel: string;
#   imageUrl: string;
#   route?: string;
# };

# export type HomeCategory = {
#   id: string;
#   name: string;
#   iconUrl: string;
# };

# export type HomeProduct = {
#   id: string;
#   title: string;
#   price: number;
#   rating: number;
#   imageUrl?: string;
# };


def get_optional_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """
    พยายามดึง current user แต่ไม่ raise exception ถ้าไม่มี
    ใช้สำหรับ endpoint ที่ไม่จำเป็นต้อง login แต่ต้องการรู้ว่า user คือใคร (ถ้ามี)
    """
    try:
        return get_current_user_from_cookie(request, db)
    except:
        return None


@router.get("")
def get_home_data(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    API สำหรับดึงข้อมูลทั้งหมดที่ต้องใช้ในหน้า Home
    - Banners: ข้อมูลโปรโมชั่น (Hardcoded)
    - Categories: หมวดหมู่สินค้า (จาก Database)
    - Products: สินค้าแนะนำ (ดึงจาก DB)
    
    🔒 กฎการแสดงสินค้า:
    1. ✅ แสดงเฉพาะสินค้าที่ is_active = True และ is_draft = False
    2. ✅ แสดงเฉพาะสินค้าจากร้านที่ is_active = True (ร้านที่เปิดอยู่)
    3. ✅ ไม่แสดงสินค้าของตัวเอง (ถ้า login อยู่)
    """
    try:
        # 1. Banners (ข้อมูลส่วนนี้มักจะไม่ค่อยเปลี่ยน จึงใส่เป็น static)
        banners = [
            {
                "id": "banner-001",
                "title": "Virtual Try-On",
                "subtitle": "ลองเสื้อผ้าออนไลน์ก่อนตัดสินใจซื้อ",
                "buttonLabel": "ลองเลย!",
                "imageUrl": "/static/images/banners/vton_banner.png",
                "route": "/try-on",
            },
            {
                "id": "banner-002",
                "title": "ลดราคาสูงสุด 50%",
                "subtitle": "สินค้าแฟชั่นชายและหญิง",
                "buttonLabel": "ช้อปเลย",
                "imageUrl": "/static/images/banners/sale_banner.png",
                "route": "/products",
            },
        ]

        # 2. Categories (ดึงจาก Database)
        category_rows = (
            db.query(Category)
            .filter(Category.is_active == True)
            .order_by(Category.name)
            .all()
        )
        
        categories = []
        for cat in category_rows:
            categories.append({
                "id": str(cat.category_id),
                "name": cat.name,
                "slug": cat.slug,
                "iconUrl": cat.image if cat.image else None,
            })

        # 3. ดึง store_id ของตัวเอง (ถ้า login อยู่)
        current_user_store_id = None
        if current_user:
            user_store = db.query(Store).filter(Store.user_id == current_user.user_id).first()
            if user_store:
                current_user_store_id = user_store.store_id
                print(f"🛍️ Current user store_id: {current_user_store_id}")

        # 4. Products (ดึงสินค้าล่าสุด 10 รายการ)
        product_query = (
            db.query(Product, ProductImage, Store)
            .join(Store, Product.store_id == Store.store_id)  # ✅ Join กับ Store
            .outerjoin(
                ProductImage,
                and_(
                    Product.product_id == ProductImage.product_id,
                    ProductImage.variant_id == None,            # ✅ ไม่เอารูปของ variant
                    ProductImage.is_main == True,               # ✅ เอารูปหลักเท่านั้น
                    ProductImage.image_type == ImageType.NORMAL # ✅ กันรูป VTON
                ),
            )
            .filter(
                Product.is_active == True,
                Product.is_draft == False,
                Store.is_active == True  # ✅ เฉพาะร้านที่เปิดอยู่
            )
        )

        # ✅ กรองสินค้าของตัวเองออก (ถ้า login อยู่)
        if current_user_store_id:
            product_query = product_query.filter(Product.store_id != current_user_store_id)
            print(f"🚫 Filtering out products from store: {current_user_store_id}")

        product_rows = (
            product_query
            .order_by(Product.created_at.desc())
            .limit(10)
            .all()
        )

        products = []
        for p, img, store in product_rows:
            products.append({
                "id": str(p.product_id),
                "title": p.product_name,
                "price": p.base_price,
                "rating": p.average_rating or 0,
                "imageUrl": img.image_url if img else None,
                "imageId": str(img.image_id) if img else None,
                "storeName": store.name if store else None,  # เพิ่มชื่อร้านด้วย
            })

        return success_response(
            "Home data retrieved successfully", 
            {
                "banners": banners, 
                "categories": categories, 
                "products": products
            }
        )

    except Exception as e:
        print(f"❌ Error in get_home_data: {e}")
        return error_response("Failed to fetch home data", {"error": str(e)}, 500)


@router.get("/categories-page")
def get_category_page_data(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    API สำหรับดึงข้อมูลทั้งหมดที่ต้องใช้ในหน้า Categories
    - Categories: หมวดหมู่สินค้า (จาก Database)
    - Products: สินค้าทั้งหมดพร้อม categoryId (ดึงจาก DB)
    
    🔒 กฎการแสดงสินค้า:
    1. ✅ แสดงเฉพาะสินค้าที่ is_active = True และ is_draft = False
    2. ✅ แสดงเฉพาะสินค้าจากร้านที่ is_active = True (ร้านที่เปิดอยู่)
    3. ✅ ไม่แสดงสินค้าของตัวเอง (ถ้า login อยู่)
    """
    try:
        # 1. Categories (ดึงจาก Database)
        category_rows = (
            db.query(Category)
            .filter(Category.is_active == True)
            .order_by(Category.name)
            .all()
        )
        
        categories = []
        for cat in category_rows:
            categories.append({
                "id": str(cat.category_id),
                "name": cat.name,
                "slug": cat.slug,
                "iconUrl": cat.image if cat.image else None,
            })

        # 2. ดึง store_id ของตัวเอง (ถ้า login อยู่)
        current_user_store_id = None
        if current_user:
            user_store = db.query(Store).filter(Store.user_id == current_user.user_id).first()
            if user_store:
                current_user_store_id = user_store.store_id
                print(f"🛍️ Current user store_id: {current_user_store_id}")

        # 3. Products (ดึงสินค้าทั้งหมดที่ active)
        product_query = (
            db.query(Product, ProductImage, Store)
            .join(Store, Product.store_id == Store.store_id)  # ✅ Join กับ Store
            .outerjoin(
                ProductImage,
                and_(
                    Product.product_id == ProductImage.product_id,
                    ProductImage.variant_id == None,            # ✅ ไม่เอารูปของ variant
                    ProductImage.is_main == True,               # ✅ เอารูปหลักเท่านั้น
                    ProductImage.image_type == ImageType.NORMAL # ✅ กันรูป VTON
                ),
            )
            .filter(
                Product.is_active == True,
                Product.is_draft == False,
                Store.is_active == True  # ✅ เฉพาะร้านที่เปิดอยู่
            )
        )

        # ✅ กรองสินค้าของตัวเองออก (ถ้า login อยู่)
        if current_user_store_id:
            product_query = product_query.filter(Product.store_id != current_user_store_id)
            print(f"🚫 Filtering out products from store: {current_user_store_id}")

        product_rows = (
            product_query
            .order_by(Product.created_at.desc())
            .all()
        )

        products = []
        for p, img, store in product_rows:
            products.append(
                {
                    "id": str(p.product_id),
                    "title": p.product_name,
                    "price": p.base_price,
                    "rating": p.average_rating or 0,
                    "imageUrl": img.image_url if img else None,
                    "imageId": str(img.image_id) if img else None,
                    # ใช้ category_id (UUID) เป็น key
                    "categoryId": str(p.category_id) if p.category_id else None,
                    "storeName": store.name if store else None,  # เพิ่มชื่อร้านด้วย
                }
            )

        payload = {"categories": categories, "products": products}
        return success_response(
            "Category page data retrieved successfully", payload
        )

    except Exception as e:
        print(f"❌ Error in get_category_page_data: {e}")
        return error_response(
            "Failed to fetch category page data", {"error": str(e)}, 500
        )