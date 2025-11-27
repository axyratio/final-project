# app/api/cart.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.repositories import cart_repository
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/cart", tags=["cart"])


class AddToCartIn(BaseModel):
    product_id: str
    variant_id: str  # ❗ ตรงกับ model ที่ variant_id nullable=False
    quantity: int = 1


@router.post("/items")
def add_to_cart_api(
    payload: AddToCartIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    try:
        cart_repository.add_to_cart(
            db=db,
            user_id=current_user.user_id,
            product_id=payload.product_id,
            variant_id=payload.variant_id,
            quantity=payload.quantity,
        )
        db.commit()
        return success_response("เพิ่มสินค้าลงตะกร้าแล้ว", {})
    except Exception as e:
        db.rollback()
        print("add_to_cart_api error:", e)
        return error_response(
            "ไม่สามารถเพิ่มสินค้าลงตะกร้า",
            {"error": str(e)},
            status_code=500,
        )


@router.get("/summary")
def cart_summary_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    try:
        count = cart_repository.get_total_items(db, user_id=current_user.user_id)
        return success_response("cart summary", {"item_count": count})
    except Exception as e:
        print("cart_summary_api error:", e)
        return error_response(
            "ไม่สามารถโหลดข้อมูลตะกร้า",
            {"error": str(e)},
            status_code=500,
        )
