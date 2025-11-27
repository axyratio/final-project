from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.database import get_db
from app.models.product import ImageType, Product, ProductImage
from app.utils.response_handler import success_response, error_response

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

@router.get("")
def get_home_data(db: Session = Depends(get_db)):
    """
    API สำหรับดึงข้อมูลทั้งหมดที่ต้องใช้ในหน้า Home
    - Banners: ข้อมูลโปรโมชั่น (Hardcoded)
    - Categories: หมวดหมู่สินค้า (Hardcoded)
    - Products: สินค้าแนะนำ (ดึงจาก DB)
    """
    try:
        # 1. Banners (ข้อมูลส่วนนี้มักจะไม่ค่อยเปลี่ยน จึงใส่เป็น static)
        banners = [
            {
                "id": "banner-001",
                "title": "Virtual Try-On",
                "subtitle": "ลองเสื้อผ้าออนไลน์ก่อนตัดสินใจซื้อ",
                "buttonLabel": "ลองเลย!",
                "imageUrl": "/static/images/banners/vton_banner.png", # ตัวอย่าง Path
                "route": "/try-on",
            },
            {
                "id": "banner-002",
                "title": "ลดราคาสูงสุด 50%",
                "subtitle": "สินค้าแฟชั่นชายและหญิง",
                "buttonLabel": "ช้อปเลย",
                "imageUrl": "/static/images/banners/sale_banner.png", # ตัวอย่าง Path
                "route": "/products",
            },
        ]

        # 2. Categories (ใส่เป็น static เพื่อควบคุม icon และลำดับ)
        categories = [
            {"id": "tshirt", "name": "เสื้อยืด", "iconUrl": "/static/icons/tshirt.svg"},
            {"id": "shirt", "name": "เสื้อเชิ้ต", "iconUrl": "/static/icons/shirt.svg"},
            {"id": "sport", "name": "เสื้อกีฬา", "iconUrl": "/static/icons/jeans.svg"},
            {"id": "cute", "name": "เสื้อน่ารัก", "iconUrl": "/static/icons/dress.svg"},
            # {"id": "more", "name": "อื่น ๆ", "iconUrl": "/static/icons/more.svg"},
        ]

        # 3. Products (ดึงสินค้าล่าสุด 10 รายการ)
        product_rows = (
            db.query(Product, ProductImage)
            .outerjoin(
                ProductImage,
                and_(
                    Product.product_id == ProductImage.product_id,
                    ProductImage.variant_id == None,            # ✅ ไม่เอารูปของ variant
                    ProductImage.is_main == True,               # ✅ เอารูปหลักเท่านั้น
                    ProductImage.image_type == ImageType.NORMAL # ✅ กันรูป VTON
                ),
            )
            .filter(Product.is_active == True, Product.is_draft == False)
            .order_by(Product.created_at.desc())
            .limit(10)
            .all()
        )

        products = []
        # print(product_rows, "product_rows in home after join")
        for p, img in product_rows:
            products.append({
                "id": str(p.product_id),
                "title": p.product_name,
                "price": p.base_price,
                "rating": p.average_rating or 0,
                "imageUrl": img.image_url if img else None,
                "imageId": str(img.image_id) if img else None, # 🆕 เพิ่ม imageId
            })

        return success_response("Home data retrieved successfully", {"banners": banners, "categories": categories, "products": products})

    except Exception as e:
        return error_response("Failed to fetch home data", {"error": str(e)}, 500)

@router.get("/categories-page")
def get_category_page_data(db: Session = Depends(get_db)):
    """
    API สำหรับดึงข้อมูลทั้งหมดที่ต้องใช้ในหน้า Categories
    - Categories: หมวดหมู่สินค้า (Hardcoded)
    - Products: สินค้าทั้งหมดพร้อม categoryId (ดึงจาก DB)
    """
    try:
        # 1. Categories (ใช้ข้อมูลชุดเดียวกับหน้า Home)
        categories = [
            {"id": "tshirt", "name": "เสื้อยืด", "iconUrl": "/static/icons/tshirt.svg"},
            {"id": "shirt", "name": "เสื้อเชิ้ต", "iconUrl": "/static/icons/shirt.svg"},
            {"id": "sport", "name": "เสื้อกีฬา", "iconUrl": "/static/icons/jeans.svg"},
            {"id": "cute", "name": "เสื้อน่ารัก", "iconUrl": "/static/icons/dress.svg"},
            {"id": "formal", "name": "เสื้อทางการ", "iconUrl": "/static/icons/formal.svg"},

            # 🆕 เพิ่มหมวด “ชุดนอน”
            {"id": "sleepwear", "name": "ชุดนอน", "iconUrl": "/static/icons/pajama.svg"},
        ]

        # 2. Products (ดึงสินค้าทั้งหมดที่ active)
        #    สำคัญ: join รูปหลักเฉพาะของ product (variant_id == None)
        product_rows = (
            db.query(Product, ProductImage)
            .outerjoin(
                ProductImage,
                and_(
                    Product.product_id == ProductImage.product_id,
                    ProductImage.variant_id == None,            # ✅ ไม่เอารูปของ variant
                    ProductImage.is_main == True,               # ✅ เอารูปหลักเท่านั้น
                    ProductImage.image_type == ImageType.NORMAL # ✅ กันรูป VTON
                ),
            )
            .filter(Product.is_active == True, Product.is_draft == False)
            .order_by(Product.created_at.desc())
            .all()
        )

        products = []
        for p, img in product_rows:
            products.append(
                {
                    "id": str(p.product_id),
                    "title": p.product_name,
                    "price": p.base_price,
                    "rating": p.average_rating or 0,
                    "imageUrl": img.image_url if img else None,
                    "imageId": str(img.image_id) if img else None,
                    # ตรงนี้มึงจะใช้ p.category (ภาษาไทย) หรือ p.category_id ก็ได้แล้วแต่ FE
                    "categoryId": p.category,
                }
            )

        payload = {"categories": categories, "products": products}
        return success_response(
            "Category page data retrieved successfully", payload
        )

    except Exception as e:
        return error_response(
            "Failed to fetch category page data", {"error": str(e)}, 500
        )