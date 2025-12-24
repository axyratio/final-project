# app/services/checkout_service.py
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.stripe_client import stripe

from app.models.cart import Cart, CartItem
from app.models.product import ProductVariant, Product
from app.models.order_item import OrderItem
from app.models.order import Order
from app.models.payment import Payment, PaymentStatus
from app.models.shipping_address import ShippingAddress
from app.models.store import Store
from app.models.stock_reservation import StockReservation
from app.models.user import User

from app.schemas.checkout import CheckoutRequest, CheckoutItem, CheckoutResponse
from app.repositories.stock_reservation_repository import get_active_reserved_quantity
from app.utils.now_utc import now_utc
from app.core.config import settings
from app.utils.order_task import check_order_timeout


RESERVATION_MINUTES = 1


class CheckoutService:

    @staticmethod
    def _build_items_from_cart(
        db: Session,
        user: User,
        cart_id: UUID,
        selected_cart_item_ids: Optional[list[UUID]],
    ) -> Tuple[List[dict], bool, UUID]:
        cart = (
            db.query(Cart)
            .filter(Cart.cart_id == cart_id, Cart.user_id == user.user_id)
            .first()
        )
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found หรือไม่ใช่ของ user นี้")

        if not cart.items:
            raise HTTPException(status_code=400, detail="Cart ว่างเปล่า")

        if selected_cart_item_ids:
            selected_set = {UUID(str(x)) for x in selected_cart_item_ids}
            cart_items: List[CartItem] = [
                ci for ci in cart.items if ci.cart_item_id in selected_set
            ]
        else:
            cart_items = list(cart.items)

        if not cart_items:
            raise HTTPException(status_code=400, detail="ยังไม่ได้เลือกสินค้าในตะกร้า")

        items: List[dict] = []
        for item in cart_items:
            variant: ProductVariant = item.variant
            product: Product = variant.product
            store: Store = product.store

            items.append(
                {
                    "variant": variant,
                    "product": product,
                    "store": store,
                    "quantity": item.quantity,
                    "unit_price": item.price_at_addition,
                    "cart_item_id": item.cart_item_id,
                }
            )

        return items, True, cart.cart_id

    @staticmethod
    def _build_items_from_direct(
        db: Session,
        payload_items: List[CheckoutItem],
    ) -> Tuple[List[dict], bool, None]:
        if not payload_items:
            raise HTTPException(status_code=400, detail="items ห้ามว่างเมื่อ checkout_type=DIRECT")

        items: List[dict] = []
        for item in payload_items:
            variant: ProductVariant = (
                db.query(ProductVariant)
                .filter(
                    ProductVariant.variant_id == item.variant_id,
                    ProductVariant.is_active == True,
                )
                .first()
            )
            if not variant:
                raise HTTPException(status_code=404, detail=f"Variant {item.variant_id} ไม่พบ")

            product: Product = variant.product
            store: Store = product.store

            unit_price = variant.price or product.base_price

            items.append(
                {
                    "variant": variant,
                    "product": product,
                    "store": store,
                    "quantity": item.quantity,
                    "unit_price": unit_price,
                }
            )

        return items, False, None

    @staticmethod
    def _validate_stock_only(db: Session, items: List[dict]) -> None:
        now = now_utc()
        for item in items:
            variant: ProductVariant = item["variant"]
            qty = item["quantity"]

            reserved_qty = get_active_reserved_quantity(db, variant.variant_id, now)
            available = (variant.stock or 0) - reserved_qty

            if available < qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"สินค้า {variant.sku} คงเหลือไม่พอ (available={available}, requested={qty})",
                )

    @staticmethod
    def _create_reservations(db: Session, items: List[dict], expires_at: datetime) -> None:

        for item in items:
            variant: ProductVariant = item["variant"]
            qty = item["quantity"]
            order: Order = item["order"]

            reservation = StockReservation(
                order_id=order.order_id,
                variant_id=variant.variant_id,
                quantity=qty,
                expires_at=expires_at,
            )
            db.add(reservation)

    @staticmethod
    def checkout(db: Session, user: User, payload: CheckoutRequest) -> CheckoutResponse:
        """
        Multi-store:
        1) Build items จาก cart หรือ direct
        2) Validate stock
        3) Group by store → สร้างหลาย Order
        4) สร้าง Payment เดียว (รวมยอดทุก order) แล้วผูก payment_id เข้าไปทุก Order
        5) สร้าง StockReservation สำหรับทุก item
        6) สร้าง Stripe Checkout Session เดียว (ผูก transfer_group = payment_id)
        """
        now = now_utc()
        expires_at = now + timedelta(minutes=RESERVATION_MINUTES)
        
        
        if payload.checkout_type == "CART":
            items, is_from_cart, cart_id = CheckoutService._build_items_from_cart(
                db, user, payload.cart_id, payload.selected_cart_item_ids,
            )
        elif payload.checkout_type == "DIRECT":
            items, is_from_cart, cart_id = CheckoutService._build_items_from_direct(
                db, payload.items
            )
        else:
            raise HTTPException(status_code=400, detail="checkout_type ต้องเป็น CART หรือ DIRECT")

        shipping_address = (
            db.query(ShippingAddress)
            .filter(
                ShippingAddress.ship_addr_id == payload.shipping_address_id,
                ShippingAddress.user_id == user.user_id,
            )
            .first()
        )
        if not shipping_address:
            raise HTTPException(status_code=404, detail="ไม่พบที่อยู่จัดส่งของผู้ใช้")

        try:
            CheckoutService._validate_stock_only(db, items)

            # 3) group items ตาม store → สร้าง Order แยกร้าน
            items_by_store: Dict[UUID, List[dict]] = {}
            for it in items:
                store_id: UUID = it["store"].store_id
                items_by_store.setdefault(store_id, []).append(it)

            orders: List[Order] = []
            grand_total = 0.0

            for store_id, store_items in items_by_store.items():
                order_total = sum(
                    i["unit_price"] * i["quantity"] for i in store_items
                )

                order = Order(
                    user_id=user.user_id,
                    store_id=store_id,
                    ship_addr_id=payload.shipping_address_id,
                    order_status="PENDING",
                    order_text_status="กำลังจัดเตรียม",
                    customer_name=shipping_address.full_name,
                    shipping_cost=0.0,
                    total_price=order_total,
                )
                db.add(order)
                db.flush()  # ได้ order_id

                for i in store_items:
                    variant: ProductVariant = i["variant"]
                    product: Product = i["product"]

                    order_item = OrderItem(
                        order_id=order.order_id,
                        store_id=store_id,
                        product_id=product.product_id,
                        variant_id=variant.variant_id,
                        quantity=i["quantity"],
                        unit_price=i["unit_price"],
                    )
                    db.add(order_item)

                    # แนบ order เข้าไปใน item
                    i["order"] = order

                orders.append(order)
                grand_total += order_total

            if not orders:
                raise HTTPException(status_code=400, detail="ไม่พบสินค้าในคำสั่งซื้อ")

            # 4) สร้าง Payment เดียวแล้วผูกกับทุก Order
            payment = Payment(
                amount=grand_total,
                status=PaymentStatus.PENDING,
                method_code="STRIPE_CARD",
            )
            db.add(payment)
            db.flush()  # ได้ payment_id

            CheckoutService._create_reservations(db, items, expires_at)

            db.commit()
            
            # Refresh Payment แค่ครั้งเดียวพอ เพราะมี object เดียว
            db.refresh(payment) 
            
            timeout_seconds = RESERVATION_MINUTES * 60
            
            # ✅ รวบ Loop: Refresh และ ส่ง Task ไปพร้อมกันเลย
            for order in orders:
                db.refresh(order)  # อัปเดตข้อมูลล่าสุดจาก DB (เช่น created_at)
                
                # ส่ง Task ไปรอที่ Redis ทันที
                check_order_timeout.apply_async(
                    args=[str(order.order_id)], 
                    countdown=timeout_seconds
                )

        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Checkout ล้มเหลว: {str(e)}")

        # 6) Stripe Checkout Session
        line_items = []
        print(items)
        for item in items:
            variant: ProductVariant = item["variant"]
            product: Product = item["product"]
            qty = item["quantity"]
            unit_price = item["unit_price"]

            line_items.append(
                {
                    "price_data": {
                        "currency": "thb",
                        "unit_amount": int(unit_price * 100),
                        "product_data": {
                            "name": f"{product.product_name} - {variant.name_option}",
                        },
                    },
                    "quantity": qty,
                }
            )

        success_url = f"{settings.BASE_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{settings.BASE_URL}/payment/cancel?session_id={{CHECKOUT_SESSION_ID}}"

        order_ids = [str(o.order_id) for o in orders]

        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="payment",
                line_items=line_items,
                success_url=success_url,
                cancel_url=cancel_url,
                payment_intent_data={
                    # 👇 ใช้ payment_id เป็น transfer_group ไว้แจกเงินทีหลัง
                    "transfer_group": str(payment.payment_id),
                },
                metadata={
                    "user_id": str(user.user_id),
                    "is_from_cart": "true" if is_from_cart else "false",
                    "cart_id": str(cart_id) if cart_id else "",
                    "app_payment_id": str(payment.payment_id),
                    # "order_ids": ",".join(order_ids),
                },
            )
            print(f"check session create: {session.id}, url: {session.url}, session object: {session}")
            print(f"check payment intent id: {session.payment_intent}")
            payment.stripe_session_id = session.id
            db.commit()
            db.refresh(payment)

        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"สร้าง Stripe session ล้มเหลว: {str(e)}")

        return CheckoutResponse(
            order_ids=[o.order_id for o in orders],
            stripe_session_id=session.id,
            stripe_checkout_url=session.url,
            expires_at=expires_at
        )
