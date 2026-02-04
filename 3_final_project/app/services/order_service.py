# =============================================================
# FILE: app/services/order_service.py
# PURPOSE: Service จัดการ Order ทั้งหมด
#          ส่วนที่เกี่ยวกับ notification อยู่ใน
#          update_order_status_with_notification()
#          ซึ่ง call NotificationService helper ตาม status ใหม่:
#            CANCELLED  → notify_order_cancelled_by_store
#            PREPARING  → notify_order_approved
#            DELIVERED  → notify_order_delivered
#          (notify_return_approved ถูก call จาก seller_router แทน)
# =============================================================

from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from uuid import UUID
from typing import Optional, List, Dict
from datetime import datetime

from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.cart import Cart, CartItem
from app.models.return_order import ReturnOrder
from app.models.product import Product, ProductVariant
from app.models.store import Store
from app.services.notification_service import NotificationService
from app.utils.now_utc import now_utc


class OrderService:

    # ─────────────────────────────────────────
    # Status text map (สถานะ → ภาษาไทย)
    # ─────────────────────────────────────────
    @staticmethod
    def get_status_text(status: str) -> str:
        status_map = {
            "UNPAID": "รอชำระเงิน",
            "PAID": "ชำระเงินแล้ว",
            "PREPARING": "กำลังเตรียมสินค้า",
            "SHIPPED": "จัดส่งแล้ว",
            "DELIVERED": "จัดส่งสำเร็จ",
            "COMPLETED": "ได้รับสินค้าแล้ว",
            "RETURNING": "กำลังคืนสินค้า",
            "RETURNED": "คืนสินค้าแล้ว",
            "REJECTED": "ปฏิเสธการคืนสินค้า",
            "APPROVED": "อนุมัติการคืนเงิน",
            "CANCELLED": "ยกเลิก",
            "FAILED": "ล้มเหลว"
        }
        return status_map.get(status, status)

    # ─────────────────────────────────────────
    # Permission checks
    # ─────────────────────────────────────────
    @staticmethod
    def can_confirm_received(order_status: str) -> bool:
        return order_status == "DELIVERED"

    @staticmethod
    def can_return(order_status: str) -> bool:
        return order_status == "DELIVERED"

    @staticmethod
    def can_review(order_status: str) -> bool:
        return order_status == "COMPLETED"

    # ─────────────────────────────────────────
    # Format helpers
    # ─────────────────────────────────────────
    @staticmethod
    def format_return_info(return_req) -> Optional[Dict]:
        if not return_req:
            return None
        return {
            "return_id": str(return_req.return_id),
            "reason": return_req.reason.value if hasattr(return_req.reason, 'value') else return_req.reason,
            "reason_detail": return_req.reason_detail,
            "image_urls": return_req.image_urls or [],
            "status": return_req.status.value if hasattr(return_req.status, 'value') else return_req.status,
            "status_text": return_req.status_text,
            "refund_amount": float(return_req.refund_amount) if return_req.refund_amount else 0.0,
            "store_note": return_req.store_note,
            "created_at": return_req.created_at.isoformat() if return_req.created_at else None,
            "updated_at": return_req.updated_at.isoformat() if return_req.updated_at else None
        }

    @staticmethod
    def format_order_response(order: Order) -> Dict:
        latest_return = order.return_requests[0] if order.return_requests else None
        return {
            "order_id": str(order.order_id),
            "store_id": str(order.store_id),
            "store_name": order.store.name if order.store else "ไม่ระบุ",
            "order_status": order.order_status,
            "order_text_status": OrderService.get_status_text(order.order_status),
            "customer_name": order.customer_name,
            "shipping_cost": float(order.shipping_cost),
            "tracking_number": order.tracking_number,
            "courier_name": order.courier_name,
            "total_price": float(order.total_price),
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None,
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
            "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
            "completed_at": order.completed_at.isoformat() if order.completed_at else None,
            "return_info": OrderService.format_return_info(latest_return),
            "order_items": [
                {
                    "order_item_id": str(item.order_item_id),
                    "product_id": str(item.product_id),
                    "variant_id": str(item.variant_id) if item.variant_id else None,
                    "product_name": item.product.product_name if item.product else "ไม่ระบุ",
                    "variant_name": item.variant.name_option if item.variant else "ไม่ระบุ",
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "image_url": item.product.images[0].image_url if item.product and item.product.images else None,
                }
                for item in order.order_items
            ],
            "can_confirm_received": OrderService.can_confirm_received(order.order_status),
            "can_return": OrderService.can_return(order.order_status),
            "can_review": OrderService.can_review(order.order_status),
        }

    # ─────────────────────────────────────────
    # CRUD
    # ─────────────────────────────────────────
    @staticmethod
    def get_user_orders(db: Session, user_id: UUID, status: Optional[str] = None) -> List[Dict]:
        query = (
            db.query(Order)
            .options(
                joinedload(Order.store),
                joinedload(Order.order_items).joinedload(OrderItem.product),
                joinedload(Order.order_items).joinedload(OrderItem.variant),
                joinedload(Order.payment),
                joinedload(Order.return_requests),
            )
            .filter(Order.user_id == user_id)
        )
        if status:
            query = query.filter(Order.order_status == status)
        orders = query.order_by(Order.created_at.desc()).all()
        return [OrderService.format_order_response(order) for order in orders]

    @staticmethod
    def get_order_detail(db: Session, order_id: UUID, user_id: UUID) -> Optional[Dict]:
        order = (
            db.query(Order)
            .options(
                joinedload(Order.store),
                joinedload(Order.order_items).joinedload(OrderItem.product),
                joinedload(Order.order_items).joinedload(OrderItem.variant),
                joinedload(Order.payment),
                joinedload(Order.shipping_address),
                joinedload(Order.return_requests)
            )
            .filter(Order.order_id == order_id, Order.user_id == user_id)
            .first()
        )
        if not order:
            return None
        return OrderService.format_order_response(order)

    @staticmethod
    def confirm_order_received(db: Session, order_id: UUID, user_id: UUID) -> Dict:
        order = (
            db.query(Order)
            .options(
                joinedload(Order.store),
                joinedload(Order.order_items).joinedload(OrderItem.product),
                joinedload(Order.order_items).joinedload(OrderItem.variant),
                joinedload(Order.payment)
            )
            .filter(Order.order_id == order_id, Order.user_id == user_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=404, detail="ไม่พบคำสั่งซื้อ")
        if order.order_status != "DELIVERED":
            raise HTTPException(
                status_code=400,
                detail=f"ไม่สามารถยืนยันรับสินค้าได้ สถานะปัจจุบัน: {OrderService.get_status_text(order.order_status)}"
            )
        order.order_status = "COMPLETED"
        order.order_text_status = OrderService.get_status_text("COMPLETED")
        order.updated_at = now_utc()
        order.completed_at = now_utc()
        db.commit()
        db.refresh(order)
        return OrderService.format_order_response(order)

    @staticmethod
    def reorder_items(db: Session, order_id: UUID, user_id: UUID) -> Dict:
        order = (
            db.query(Order)
            .options(joinedload(Order.order_items))
            .filter(Order.order_id == order_id, Order.user_id == user_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=404, detail="ไม่พบคำสั่งซื้อ")
        cart = db.query(Cart).filter(Cart.user_id == user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            db.add(cart)
            db.flush()
        items_added = 0
        for order_item in order.order_items:
            product = db.query(Product).filter(Product.product_id == order_item.product_id).first()
            if not product or not product.is_active:
                continue
            variant = None
            if order_item.variant_id:
                variant = db.query(ProductVariant).filter(
                    ProductVariant.variant_id == order_item.variant_id
                ).first()
                if not variant or variant.stock <= 0:
                    continue
            existing = db.query(CartItem).filter(
                CartItem.cart_id == cart.cart_id,
                CartItem.product_id == order_item.product_id,
                CartItem.variant_id == order_item.variant_id
            ).first()
            if existing:
                existing.quantity += order_item.quantity
                existing.updated_at = now_utc()
            else:
                db.add(CartItem(
                    cart_id=cart.cart_id,
                    product_id=order_item.product_id,
                    variant_id=order_item.variant_id,
                    quantity=order_item.quantity,
                    price_at_addition=order_item.variant.price,
                ))
            items_added += 1
        db.commit()
        return {"cart_items_added": items_added, "message": f"เพิ่ม {items_added} รายการเข้าตะกร้าสำเร็จ"}

    # ============================================================
    # ⭐ อัปเดตสถานะ + ส่ง notification แบบ realtime
    # เมื่อ seller เปลี่ยน status ของ order
    # → method นี้จะเรียก NotificationService helper ที่เหมาะสม
    # ============================================================
    # =============================================================
# เพิ่ม method นี้ใน OrderService class
# ไฟล์: app/services/order_service.py
# =============================================================

    @staticmethod
    async def update_order_status_with_notification(
        db: Session,
        order_id: UUID,
        new_status: str,
        note: Optional[str] = None
    ) -> Dict:
        """
        อัปเดตสถานะออเดอร์ + ส่ง notification อัตโนมัติ
        
        ใช้โดย:
        - seller_router.approve_order() → PREPARING → notify_order_approved
        - seller_router.cancel_order() → CANCELLED → notify_order_cancelled_by_store
        - order_tasks.simulate_delivery() → DELIVERED → notify_order_delivered
        """
        print(f"\n{'='*80}")
        print(f"[ORDER_SERVICE] 🎯 update_order_status_with_notification CALLED")
        print(f"[ORDER_SERVICE] order_id: {order_id}")
        print(f"[ORDER_SERVICE] new_status: {new_status}")
        print(f"[ORDER_SERVICE] note: {note}")
        print(f"{'='*80}\n")
        
        from sqlalchemy.orm import joinedload
        from app.models.order_item import OrderItem
        from app.models.product import Product
        
        # 1. ค้นหา order พร้อม relationships
        print(f"[ORDER_SERVICE] 📦 Loading order with relationships...")
        
        try:
            order = (
                db.query(Order)
                .options(
                    joinedload(Order.order_items)
                    .joinedload(OrderItem.product)
                    .joinedload(Product.images)
                )
                .filter(Order.order_id == order_id)
                .first()
            )
            
            if not order:
                print(f"[ORDER_SERVICE] ❌ Order not found: {order_id}")
                raise HTTPException(status_code=404, detail="Order not found")
            
            print(f"[ORDER_SERVICE] ✅ Order loaded:")
            print(f"  - order_id: {order.order_id}")
            print(f"  - old status: {order.order_status}")
            print(f"  - user_id: {order.user_id}")
            print(f"  - store_id: {order.store_id}")
            print(f"  - order_items count: {len(order.order_items) if order.order_items else 0}")
            
        except Exception as e:
            print(f"[ORDER_SERVICE] ❌ Failed to load order: {e}")
            raise
        
        # 2. เปลี่ยน status
        print(f"\n[ORDER_SERVICE] 🔄 Updating order status...")
        old_status = order.order_status
        order.order_status = new_status
        order.order_text_status = OrderService.get_status_text(new_status)
        order.updated_at = now_utc()
        
        # อัปเดต timestamp ตาม status
        if new_status == "DELIVERED" and not order.delivered_at:
            order.delivered_at = now_utc()
            print(f"[ORDER_SERVICE] Set delivered_at: {order.delivered_at}")
        elif new_status == "COMPLETED" and not order.completed_at:
            order.completed_at = now_utc()
            print(f"[ORDER_SERVICE] Set completed_at: {order.completed_at}")
        
        try:
            db.commit()
            db.refresh(order)
            print(f"[ORDER_SERVICE] ✅ Order status updated in DB")
            print(f"  - old: {old_status} → new: {new_status}")
            print(f"  - text: {order.order_text_status}")
        except Exception as e:
            print(f"[ORDER_SERVICE] ❌ DB commit failed: {e}")
            db.rollback()
            raise
        
        # 3. ส่ง notification ตาม status
        print(f"\n[ORDER_SERVICE] 📢 Sending notification for status: {new_status}")
        
        try:
            if new_status == "PREPARING":
                print(f"[ORDER_SERVICE] 🎯 Calling NotificationService.notify_order_approved...")
                await NotificationService.notify_order_approved(db, order)
                print(f"[ORDER_SERVICE] ✅ notify_order_approved completed")
                
            elif new_status == "CANCELLED":
                print(f"[ORDER_SERVICE] 🎯 Calling NotificationService.notify_order_cancelled_by_store...")
                await NotificationService.notify_order_cancelled_by_store(db, order)
                print(f"[ORDER_SERVICE] ✅ notify_order_cancelled_by_store completed")
                
            elif new_status == "DELIVERED":
                print(f"[ORDER_SERVICE] 🎯 Calling NotificationService.notify_order_delivered...")
                await NotificationService.notify_order_delivered(db, order)
                print(f"[ORDER_SERVICE] ✅ notify_order_delivered completed")
            
            else:
                print(f"[ORDER_SERVICE] ⚠️ No notification handler for status: {new_status}")
                
        except Exception as e:
            print(f"[ORDER_SERVICE] ❌ Notification failed: {e}")
            print(f"[ORDER_SERVICE] Exception type: {type(e).__name__}")
            import traceback
            print(f"[ORDER_SERVICE] Traceback:\n{traceback.format_exc()}")
            # ไม่ rollback order update
        
        # 4. คืน response
        result = {
            "order_id": str(order.order_id),
            "old_status": old_status,
            "new_status": new_status,
            "new_status_text": order.order_text_status,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        }
        
        print(f"\n[ORDER_SERVICE] ✅ Returning result:")
        print(f"{result}")
        print(f"{'='*80}\n")
        
        return result