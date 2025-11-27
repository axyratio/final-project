# app/repositories/cart_repository.py
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID as UUIDType

from app.models.cart import Cart, CartItem
from app.models.product import Product, ProductVariant


def get_or_create_active_cart(db: Session, user_id: UUIDType) -> Cart:
    cart = (
        db.query(Cart)
        .filter(Cart.user_id == user_id, Cart.is_active == True)
        .first()
    )
    if cart:
        return cart

    cart = Cart(user_id=user_id)
    db.add(cart)
    db.flush()  # ให้ได้ cart.cart_id
    return cart


def add_to_cart(
    db: Session,
    user_id: UUIDType,
    product_id: UUIDType,
    variant_id: UUIDType,
    quantity: int = 1,
):
    cart = get_or_create_active_cart(db, user_id=user_id)

    # ดึง variant มาเพื่อดูราคา
    variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.variant_id == variant_id)
        .first()
    )
    if not variant:
        raise ValueError("Variant not found")

    # ดูว่ามี item เดิมอยู่แล้วไหม → ถ้ามีก็บวกจำนวน
    item = (
        db.query(CartItem)
        .filter(
            CartItem.cart_id == cart.cart_id,
            CartItem.product_id == product_id,
            CartItem.variant_id == variant_id,
        )
        .first()
    )

    if item:
        item.quantity += quantity
    else:
        item = CartItem(
            cart_id=cart.cart_id,
            product_id=product_id,
            variant_id=variant_id,
            quantity=quantity,
            price_at_addition=variant.price,  # ใช้ราคา variant ตอนหยิบเข้าตะกร้า
        )
        db.add(item)

    db.flush()
    return item


def get_total_items(db: Session, user_id: UUIDType) -> int:
    cart = (
        db.query(Cart)
        .filter(Cart.user_id == user_id, Cart.is_active == True)
        .first()
    )
    if not cart:
        return 0

    total = (
        db.query(func.coalesce(func.sum(CartItem.quantity), 0))
        .filter(CartItem.cart_id == cart.cart_id)
        .scalar()
    )
    return int(total or 0)
