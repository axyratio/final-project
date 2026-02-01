# app/services/order_service.py
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
# from app.models.tracking_history import TrackingHistory, TrackingStatus
from app.services.notification_service import NotificationService
from app.utils.now_utc import now_utc


class OrderService:
    
    @staticmethod
    def get_status_text(status: str) -> str:
        """แปลงสถานะเป็นข้อความภาษาไทย"""
        status_map = {
            "UNPAID": "รอชำระเงิน",
            "PAID": "ชำระเงินแล้ว",
            "PREPARING": "กำลังเตรียมสินค้า",
            "SHIPPED": "จัดส่งแล้ว",
            "DELIVERED": "จัดส่งสำเร็จ",
            "COMPLETED": "ได้รับสินค้าแล้ว",
            "RETURNING": "กำลังคืนสินค้า",
            "RETURNED": "คืนสินค้าแล้ว",
            "REJECTED": "ปฏิเสธการคืนสินค้า", # 👈 เพิ่มใหม่: กรณีร้านไม่รับคืน
            "APPROVED": "อนุมัติการคืนเงิน", # 👈 เพิ่มใหม่: กรณีรับคืน/รอโอนเงิน
            "CANCELLED": "ยกเลิก",
            "FAILED": "ล้มเหลว"
        }
        return status_map.get(status, status)
    
    @staticmethod
    def can_confirm_received(order_status: str) -> bool:
        """ตรวจสอบว่าสามารถยืนยันรับสินค้าได้หรือไม่"""
        return order_status == "DELIVERED"
    
    @staticmethod
    def can_return(order_status: str) -> bool:
        """ตรวจสอบว่าสามารถคืนสินค้าได้หรือไม่"""
        # สามารถคืนได้เฉพาะเมื่อ DELIVERED (ยังไม่ยืนยันรับ)
        return order_status == "DELIVERED"
    
    @staticmethod
    def can_review(order_status: str) -> bool:
        """ตรวจสอบว่าสามารถรีวิวได้หรือไม่"""
        # สามารถรีวิวได้เฉพาะเมื่อ COMPLETED (ยืนยันรับแล้ว)
        return order_status == "COMPLETED"
    
    @staticmethod
    def format_return_info(return_req: any) -> Optional[Dict]:
        """
        ฟังก์ชันนี้ผมสร้างขึ้นเพื่อจัดการ format ข้อมูลการคืนสินค้าโดยเฉพาะ
        """
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
        """จัดรูปแบบ Order เป็น Response"""
        
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
    
    @staticmethod
    def get_user_orders(
        db: Session,
        user_id: UUID,
        status: Optional[str] = None
    ) -> List[Dict]:
        """ดึงรายการคำสั่งซื้อของผู้ใช้"""
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
        
        # กรองตาม status ถ้ามี
        if status:
            query = query.filter(Order.order_status == status)
        
        orders = query.order_by(Order.created_at.desc()).all()
        
        return [OrderService.format_order_response(order) for order in orders]
    
    @staticmethod
    def get_order_detail(
        db: Session,
        order_id: UUID,
        user_id: UUID
    ) -> Optional[Dict]:
        """ดึงรายละเอียดคำสั่งซื้อ"""
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
    def confirm_order_received(
        db: Session,
        order_id: UUID,
        user_id: UUID
    ) -> Dict:
        """ยืนยันว่าได้รับสินค้าแล้ว"""
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
        
        # ตรวจสอบว่าสามารถยืนยันรับสินค้าได้หรือไม่
        if order.order_status != "DELIVERED":
            raise HTTPException(
                status_code=400,
                detail=f"ไม่สามารถยืนยันรับสินค้าได้ สถานะปัจจุบัน: {OrderService.get_status_text(order.order_status)}"
            )
        
        # อัปเดตสถานะ
        order.order_status = "COMPLETED"
        order.order_text_status = OrderService.get_status_text("COMPLETED")
        order.updated_at = now_utc()
        order.completed_at = now_utc()  # ✅ บันทึกเวลายืนยันรับสินค้า
        
        db.commit()
        db.refresh(order)
        
        return OrderService.format_order_response(order)
    
    @staticmethod
    def reorder_items(
        db: Session,
        order_id: UUID,
        user_id: UUID
    ) -> Dict:
        """เพิ่มสินค้าจาก order เข้าตะกร้า"""
        order = (
            db.query(Order)
            .options(joinedload(Order.order_items))
            .filter(Order.order_id == order_id, Order.user_id == user_id)
            .first()
        )
        
        if not order:
            raise HTTPException(status_code=404, detail="ไม่พบคำสั่งซื้อ")
        
        # หา Cart ของ user (สร้างใหม่ถ้ายังไม่มี)
        cart = db.query(Cart).filter(Cart.user_id == user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            db.add(cart)
            db.flush()
        
        items_added = 0
        
        for order_item in order.order_items:
            # ตรวจสอบว่าสินค้ายังมีอยู่และมี stock หรือไม่
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
            
            # ตรวจสอบว่ามีสินค้าในตะกร้าแล้วหรือไม่
            existing_cart_item = db.query(CartItem).filter(
                CartItem.cart_id == cart.cart_id,
                CartItem.product_id == order_item.product_id,
                CartItem.variant_id == order_item.variant_id
            ).first()
            
            if existing_cart_item:
                # เพิ่มจำนวน
                existing_cart_item.quantity += order_item.quantity
                existing_cart_item.updated_at = now_utc()
            else:
                # สร้าง cart item ใหม่
                new_cart_item = CartItem(
                    cart_id=cart.cart_id,
                    product_id=order_item.product_id,
                    variant_id=order_item.variant_id,
                    quantity=order_item.quantity,
                    price_at_addition=order_item.variant.price,
                    # created_at=now_utc(),
                    # updated_at=now_utc()
                )
                db.add(new_cart_item)
            
            items_added += 1
        
        db.commit()
        
        return {
            "cart_items_added": items_added,
            "message": f"เพิ่ม {items_added} รายการเข้าตะกร้าสำเร็จ"
        }

    @staticmethod
    async def update_order_status_with_notification(
        db: Session,
        order_id: UUID,
        new_status: str,
        tracking_number: Optional[str] = None,
        courier_name: Optional[str] = None
    ) -> Dict:
        """อัปเดตสถานะออเดอร์ และส่งการแจ้งเตือนแบบ realtime เมื่อจำเป็น"""
        order = (
            db.query(Order)
            .options(
                joinedload(Order.order_items).joinedload(OrderItem.product).joinedload(Product.images)
            )
            .filter(Order.order_id == order_id)
            .first()
        )
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order.order_status = new_status
        order.order_text_status = OrderService.get_status_text(new_status)
        order.updated_at = now_utc()
        
        if tracking_number is not None:
            order.tracking_number = tracking_number
        if courier_name is not None:
            order.courier_name = courier_name
        
        if new_status == "DELIVERED":
            order.delivered_at = now_utc()
        if new_status == "COMPLETED":
            order.completed_at = now_utc()
        
        db.commit()
        db.refresh(order)
        
        # ส่ง notification ตามสถานะที่ต้องการ
        if new_status == "CANCELLED":
            await NotificationService.notify_order_cancelled_by_store(db, order)
        elif new_status == "PREPARING":
            await NotificationService.notify_order_approved(db, order)
        elif new_status == "DELIVERED":
            await NotificationService.notify_order_delivered(db, order)
        
        return OrderService.format_order_response(order)
        
# ==========================================
# ✅ ตัวอย่างการใช้งานใน routes/order_router.py
# ==========================================

