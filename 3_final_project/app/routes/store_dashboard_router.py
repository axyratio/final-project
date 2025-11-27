# app/routers/store_dashboard_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.store import Store
from app.models.product import Product, ProductImage
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/stores", tags=["Store Dashboard"])

@router.get("/me/dashboard")
def get_my_store_dashboard(
    db: Session = Depends(get_db),
    auth_user = Depends(authenticate_token()),
):
    """
    ดึงข้อมูลหน้าร้านของ seller:
    - ข้อมูลร้าน
    - รายการสินค้า + main image + rating
    """
    try:
        # หา store จาก user ปัจจุบัน
        store: Store | None = (
            db.query(Store)
            .filter(Store.user_id == auth_user.user_id)
            .first()
        )
        if not store:
            return error_response("ไม่พบร้านค้าของคุณ", {}, 404)

        # join product + main image
        rows = (
            db.query(Product, ProductImage)
            .outerjoin(
                ProductImage,
                and_(
                    ProductImage.product_id == Product.product_id,
                    ProductImage.is_main == True,
                    ProductImage.variant_id == None,
                    ProductImage.image_type == "NORMAL",
                ),
            )
            .filter(
                Product.store_id == store.store_id,
                Product.is_active == True,
            )
            .order_by(Product.created_at.desc())
            .all()
        )

        products_data = []
        rating_sum = 0.0
        rating_count = 0

        for product, image in rows:
            star = float(product.average_rating or 0.0)
            if star > 0:
                rating_sum += star
                rating_count += 1

            image_id = str(image.image_id) if image else None
            image_url = image.image_url if image else None

            products_data.append(
                {
                    "product_id": str(product.product_id),
                    "title": product.product_name,
                    "price": float(product.base_price),
                    "star": star,
                    "category": product.category,
                    "image_id": image_id,
                    "image_url": image_url,
                }
            )

        # คำนวณ rating ร้านจากค่าเฉลี่ย star ของ product
        store_rating = rating_sum / rating_count if rating_count > 0 else 0.0
        store.rating = store_rating
        db.commit()

        # สร้าง logo_url สำหรับ stream logo ของร้าน
        if store.logo_path:
            logo_url = f"/store/{store.store_id}/logo"
        else:
            logo_url = None

        store_data = {
            "store_id": str(store.store_id),
            "name": store.name,
            "logo_url": logo_url,
            "rating": store_rating,
            "is_stripe_verified": store.is_stripe_verified,
        }

        payload = {
            "store": store_data,
            "products": products_data,
        }

        return success_response("ดึงข้อมูลหน้าร้านสำเร็จ", payload)

    except Exception as e:
        db.rollback()
        return error_response("เกิดข้อผิดพลาดขณะดึงข้อมูลหน้าร้าน", {"error": str(e)}, 500)
