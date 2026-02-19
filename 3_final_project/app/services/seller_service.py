# app/services/seller_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, case
from typing import List, Optional
from datetime import datetime, timedelta
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.return_order import ReturnOrder, ReturnStatus
from app.models.seller_notification import SellerNotification, NotificationType
from app.models.product import Product, ProductImage
from app.models.user import User
from app.models.shipping_address import ShippingAddress
from app.tasks.order_tasks import simulate_delivery
from app.utils.now_utc import now_utc
from fastapi import HTTPException
from app.core.stripe_client import stripe  # ใช้ stripe ที่ตั้ง api_key แล้ว
from app.models.payment import Payment, PaymentStatus
from app.services.notification_service import NotificationService
from sqlalchemy.orm import joinedload
from app.models.order_item import OrderItem
from app.models.product import Product

import time
import logging

logger = logging.getLogger(__name__)


class SellerService:
    # app/services/seller_service.py - ส่วนแก้ไข
# (เฉพาะฟังก์ชัน get_badge_counts)

    @staticmethod
    def get_badge_counts(db: Session, store_id: str):
        """
        ดึงจำนวน Badge ทั้งหมดสำหรับหน้า Seller Menu
        
        Returns:
            - unread_notifications: การแจ้งเตือนที่ยังไม่ได้อ่าน
            - preparing_orders: ออเดอร์ที่กำลังเตรียม
            - pending_returns: คำขอคืนสินค้าที่รอดำเนินการ
            - unread_chats: แชทที่ยังไม่ได้อ่าน
        """
        # ป้องกัน Circular Import โดยการ import ภายในฟังก์ชัน
        from app.models.chat_conversation import ChatConversation
        
        # 1. นับการแจ้งเตือนที่ยังไม่ได้อ่าน
        unread_notifications = db.query(func.count(SellerNotification.notification_id)).filter(
            SellerNotification.store_id == store_id,
            SellerNotification.is_read == False
        ).scalar() or 0
        
        # 2. นับออเดอร์ที่กำลังเตรียม (สถานะ PREPARING)
        preparing_orders = db.query(func.count(Order.order_id)).filter(
            Order.store_id == store_id,
            Order.order_status == 'PREPARING'
        ).scalar() or 0
        
        # 3. นับคำขอคืนสินค้าที่รอดำเนินการ (Join กับตาราง Order เพื่อเช็ค store_id)
        pending_returns = db.query(func.count(ReturnOrder.return_id)).join(
            Order, Order.order_id == ReturnOrder.order_id
        ).filter(
            Order.store_id == store_id,
            ReturnOrder.status == ReturnStatus.PENDING
        ).scalar() or 0
        
        # 4. ✅ แก้ไขการนับแชทที่ยังไม่ได้อ่าน
        # นับจาก store_unread_count ที่มากกว่า 0
        unread_chats = db.query(func.count(ChatConversation.conversation_id)).filter(
            ChatConversation.store_id == store_id,
            ChatConversation.store_unread_count > 0
        ).scalar() or 0
        
        return {
            'unread_notifications': unread_notifications,
            'preparing_orders': preparing_orders,
            'pending_returns': pending_returns,
            'unread_chats': unread_chats
        }
    
    @staticmethod
    def get_seller_dashboard(db: Session, store_id: str, month: Optional[str] = None):
        """ดึงข้อมูล Dashboard สำหรับร้านค้า"""
        
        # กำหนดช่วงเวลา
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # ช่วงเวลาก่อนหน้า (สำหรับคำนวณการเปลี่ยนแปลง)
        yesterday_start = today_start - timedelta(days=1)
        last_week_start = week_start - timedelta(days=7)
        last_month_start = (month_start - timedelta(days=1)).replace(day=1)
        
        # คำนวณยอดขายวันนี้
        today_sales = db.query(func.sum(Order.total_price)).filter(
            Order.store_id == store_id,
            Order.order_status.in_(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'COMPLETED']),
            Order.created_at >= today_start
        ).scalar() or 0
        
        # คำนวณยอดขายเมื่อวาน
        yesterday_sales = db.query(func.sum(Order.total_price)).filter(
            Order.store_id == store_id,
            Order.order_status.in_(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'COMPLETED']),
            Order.created_at >= yesterday_start,
            Order.created_at < today_start
        ).scalar() or 0
        
        # คำนวณยอดขายสัปดาห์นี้
        week_sales = db.query(func.sum(Order.total_price)).filter(
            Order.store_id == store_id,
            Order.order_status.in_(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'COMPLETED']),
            Order.created_at >= week_start
        ).scalar() or 0
        
        # คำนวณยอดขายสัปดาห์ที่แล้ว
        last_week_sales = db.query(func.sum(Order.total_price)).filter(
            Order.store_id == store_id,
            Order.order_status.in_(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'COMPLETED']),
            Order.created_at >= last_week_start,
            Order.created_at < week_start
        ).scalar() or 0
        
        # คำนวณยอดขายเดือนนี้
        month_sales = db.query(func.sum(Order.total_price)).filter(
            Order.store_id == store_id,
            Order.order_status.in_(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'COMPLETED']),
            Order.created_at >= month_start
        ).scalar() or 0
        
        # คำนวณยอดขายเดือนที่แล้ว
        last_month_sales = db.query(func.sum(Order.total_price)).filter(
            Order.store_id == store_id,
            Order.order_status.in_(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'COMPLETED']),
            Order.created_at >= last_month_start,
            Order.created_at < month_start
        ).scalar() or 0
        
        # คำนวณ % การเปลี่ยนแปลง
        change_today = ((today_sales - yesterday_sales) / yesterday_sales * 100) if yesterday_sales > 0 else 0
        change_week = ((week_sales - last_week_sales) / last_week_sales * 100) if last_week_sales > 0 else 0
        change_month = ((month_sales - last_month_sales) / last_month_sales * 100) if last_month_sales > 0 else 0
        
        # ─────────────────────────────────────────────────────────────
        # สินค้าขายดี Top 3
        # ✅ เปลี่ยนจาก join Product มาใช้ snapshot product_name จาก order_items
        # เพื่อให้ยังแสดงชื่อได้แม้ product ถูกลบออกจากระบบ
        # Group โดยใช้ (product_id, product_name, product_image_url)
        # ─────────────────────────────────────────────────────────────
        top_raw = (
            db.query(
                OrderItem.product_id,
                OrderItem.product_name,
                OrderItem.product_image_url,
                func.sum(OrderItem.quantity).label('sold_count'),
                func.sum(OrderItem.quantity * OrderItem.unit_price).label('revenue'),
            )
            .join(Order, Order.order_id == OrderItem.order_id)
            .filter(
                Order.store_id == store_id,
                Order.order_status.in_(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'COMPLETED'])
            )
            .group_by(OrderItem.product_id, OrderItem.product_name, OrderItem.product_image_url)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(3)
            .all()
        )

        top_products = []
        for row in top_raw:
            # ถ้า product ยังอยู่ ลองดึงรูปล่าสุดจาก DB มาแทน snapshot
            image_url = row.product_image_url or ''
            if row.product_id and not image_url:
                img = db.query(ProductImage).filter(
                    ProductImage.product_id == row.product_id,
                    ProductImage.is_main == True,
                    ProductImage.variant_id == None,
                ).first()
                if img:
                    image_url = img.image_url or ''

            top_products.append({
                'product_id': str(row.product_id) if row.product_id else None,
                'product_name': row.product_name or 'สินค้าถูกลบออกจากระบบ',
                'image_url': image_url,
                'sold_count': row.sold_count,
                'revenue': float(row.revenue),
            })
        
        # ข้อมูลกราฟยอดขาย 7 วันย้อนหลัง
        sales_chart = []
        thai_days = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
        
        for i in range(6, -1, -1):
            day_start = today_start - timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            
            daily_sales = db.query(func.sum(Order.total_price)).filter(
                Order.store_id == store_id,
                Order.order_status.in_(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'COMPLETED']),
                Order.created_at >= day_start,
                Order.created_at < day_end
            ).scalar() or 0
            
            day_name = thai_days[day_start.weekday()]
            sales_chart.append({
                'date': day_name,
                'sales': float(daily_sales)
            })
        
        # นับจำนวนออเดอร์แต่ละสถานะ
        order_counts = db.query(
            Order.order_status,
            func.count(Order.order_id).label('count')
        ).filter(Order.store_id == store_id)\
        .group_by(Order.order_status).all()
        
        status_counts = {status: 0 for status in ['PREPARING', 'SHIPPED', 'DELIVERED', 'COMPLETED']}
        for status, count in order_counts:
            if status in status_counts:
                status_counts[status] = count
        
        # นับจำนวนลูกค้า
        total_customers = db.query(func.count(func.distinct(Order.user_id))).filter(
            Order.store_id == store_id
        ).scalar() or 0
        
        # นับคำขอคืนสินค้าที่รอดำเนินการ
        pending_returns = db.query(func.count(ReturnOrder.return_id)).join(
            Order, Order.order_id == ReturnOrder.order_id
        ).filter(
            Order.store_id == store_id,
            ReturnOrder.status == ReturnStatus.PENDING
        ).scalar() or 0
        
        return {
            'sales_stats': {
                'today': float(today_sales),
                'week': float(week_sales),
                'month': float(month_sales),
                'change_today': round(change_today, 2),
                'change_week': round(change_week, 2),
                'change_month': round(change_month, 2)
            },
            'top_products': top_products,
            'sales_chart': sales_chart,
            'order_status_count': {
                'preparing': status_counts['PREPARING'],
                'shipped': status_counts['SHIPPED'],
                'delivered': status_counts['DELIVERED'],
                'completed': status_counts['COMPLETED']
            },
            'total_customers': total_customers,
            'pending_returns': pending_returns
        }
    
    @staticmethod
    def get_seller_orders(db: Session, store_id: str, status: Optional[str] = None):
        """ดึงรายการออเดอร์ของร้าน"""
        query = db.query(Order).filter(Order.store_id == store_id)

        if status:
            query = query.filter(Order.order_status == status)

        orders = query.order_by(Order.created_at.desc()).all()

        result = []
        for order in orders:
            # ดึงข้อมูลลูกค้า (user_id อาจเป็น null ถ้า user ถูกลบ)
            user = db.query(User).filter(User.user_id == order.user_id).first() if order.user_id else None

            # ดึงที่อยู่จัดส่ง (ship_addr_id อาจเป็น null ถ้า address ถูกลบ)
            shipping_addr = db.query(ShippingAddress).filter(
                ShippingAddress.ship_addr_id == order.ship_addr_id
            ).first() if order.ship_addr_id else None

            # build order_items
            order_items = []
            for item in order.order_items:
                product = getattr(item, 'product', None)
                variant = getattr(item, 'variant', None)

                # ✅ product name: อ่าน snapshot ก่อน fallback relationship
                product_name = (
                    item.product_name
                    or (getattr(product, 'product_name', None) if product else None)
                    or 'สินค้าถูกลบออกจากระบบ'
                )

                # ✅ variant name: อ่าน snapshot ก่อน fallback relationship
                variant_name = (
                    item.variant_name
                    or (variant.name_option if variant and getattr(variant, 'name_option', None) else None)
                    or ''
                )

                # ✅ image_url: อ่าน snapshot ก่อน
                # look for is_main first, ถ้าไม่มีเอารูปแรก
                image_url = item.product_image_url
                if not image_url and product and getattr(product, 'images', None):
                    main_img = next((img for img in product.images if getattr(img, 'is_main', False)), None)
                    if main_img and getattr(main_img, 'image_url', None):
                        image_url = main_img.image_url
                    else:
                        first_img = product.images[0] if product.images else None
                        image_url = getattr(first_img, 'image_url', None)

                order_items.append({
                    'order_item_id': str(item.order_item_id),
                    'product_id': str(item.product_id) if item.product_id else None,
                    'product_name': product_name,
                    'variant_name': variant_name,
                    'quantity': item.quantity,
                    'unit_price': float(item.unit_price),
                    'image_url': image_url
                })

            result.append({
                'order_id': str(order.order_id),
                'customer_name': order.customer_name,
                'customer_phone': user.phone_number if user else None,
                'order_status': order.order_status,
                'order_text_status': order.order_text_status,
                'total_price': float(order.total_price),
                'shipping_cost': float(order.shipping_cost),
                'tracking_number': order.tracking_number,
                'courier_name': order.courier_name,
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'paid_at': order.paid_at.isoformat() if order.paid_at else None,
                'delivered_at': order.delivered_at.isoformat() if order.delivered_at else None,
                'completed_at': order.completed_at.isoformat() if order.completed_at else None,

                'order_items': order_items,
                'shipping_address': {
                    'full_name': shipping_addr.full_name,
                    'phone_number': shipping_addr.phone_number,
                    'address_line': shipping_addr.address_line,
                    'sub_district': shipping_addr.sub_district,
                    'district': shipping_addr.district,
                    'province': shipping_addr.province,
                    'postal_code': shipping_addr.postal_code
                } if shipping_addr else None
            })

        return result
    
    @staticmethod
    async def confirm_order_shipped(
        db: Session, 
        store_id: str, 
        order_id: str, 
        tracking_number: str, 
        courier_name: str
    ):
        """ยืนยันการจัดส่งสินค้า + แจ้งเตือน buyer"""
        from sqlalchemy.orm import joinedload
        from app.models.product import Product, ProductImage
        
        order = db.query(Order).options(
            joinedload(Order.order_items)
            .joinedload(OrderItem.product)
            .joinedload(Product.images)
        ).filter(
            Order.order_id == order_id,
            Order.store_id == store_id
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order.order_status != 'PREPARING':
            raise HTTPException(status_code=400, detail="Order is not in PREPARING status")
        
        # 1. อัปเดตข้อมูลการจัดส่งใน DB
        order.order_status = 'SHIPPED'
        order.order_text_status = 'กำลังจัดส่ง'
        order.tracking_number = tracking_number
        order.courier_name = courier_name
        order.updated_at = now_utc()
        
        db.commit()

        # 2. 🔔 แจ้งเตือน buyer ว่าสินค้าถูกจัดส่งแล้ว (ORDER_SHIPPED)
        try:
            from app.services.notification_service import NotificationService
            await NotificationService.notify(db, event="ORDER_SHIPPED", order=order)
            print(f"✅ ORDER_SHIPPED notification sent for order {order_id}", flush=True)
        except Exception as e:
            print(f"⚠️ ORDER_SHIPPED notification failed (non-blocking): {e}", flush=True)

        # 3. 🔥 เรียกใช้ Celery Task จำลองการขนส่ง
        simulate_delivery.apply_async(args=[str(order.order_id)], countdown=10)
        
        return {'message': 'ยืนยันการจัดส่งสำเร็จ และเริ่มระบบจำลองการขนส่ง'}
    
    @staticmethod
    def get_return_requests(db: Session, store_id: str, status: Optional[str] = None):
        """ดึงรายการคำขอคืนสินค้า"""
        query = db.query(ReturnOrder).join(
            Order, Order.order_id == ReturnOrder.order_id
        ).filter(Order.store_id == store_id)
        
        if status:
            query = query.filter(ReturnOrder.status == status)
        
        returns = query.order_by(ReturnOrder.created_at.desc()).all()
        
        result = []
        for ret in returns:
            # user_id อาจเป็น null ถ้า user ถูกลบ
            user = db.query(User).filter(User.user_id == ret.user_id).first() if ret.user_id else None
            
            # ✅ build order_items โดยใช้ snapshot ก่อน fallback relationship
            order_items = []
            if ret.order:
                for item in ret.order.order_items:
                    product_name = (
                        item.product_name
                        or (item.product.product_name if getattr(item, 'product', None) else None)
                        or 'สินค้าถูกลบออกจากระบบ'
                    )
                    variant_name = (
                        item.variant_name
                        or (item.variant.name_option if getattr(item, 'variant', None) and getattr(item.variant, 'name_option', None) else None)
                        or ''
                    )
                    order_items.append({
                        'product_name': product_name,
                        'variant_name': variant_name,
                        'quantity': item.quantity,
                        'unit_price': float(item.unit_price)
                    })

            result.append({
                'return_id': str(ret.return_id),
                'order_id': str(ret.order_id) if ret.order_id else None,
                'customer_name': f"{user.first_name} {user.last_name}" if user else 'ลบบัญชีแล้ว',
                'reason': ret.reason.value,
                'reason_detail': ret.reason_detail,
                'image_urls': ret.image_urls or [],
                'status': ret.status.value,
                'status_text': ret.status_text,
                'refund_amount': float(ret.refund_amount) if ret.refund_amount else 0,
                'created_at': ret.created_at.isoformat(),
                'order_items': order_items
            })
        
        return result
    
    @staticmethod
    async def handle_return_request(
            db: Session, 
            store_id: str, 
            return_id: str, 
            action: str, 
            note: Optional[str] = None
        ):
            """อนุมัติหรือปฏิเสธคำขอคืนสินค้า พร้อม Stripe Refund อัตโนมัติ"""
            ret = db.query(ReturnOrder).join(
                Order, Order.order_id == ReturnOrder.order_id
            ).filter(
                ReturnOrder.return_id == return_id,
                Order.store_id == store_id
            ).first()
            
            if not ret:
                raise HTTPException(status_code=404, detail="Return request not found")
            
            if ret.status != ReturnStatus.PENDING:
                raise HTTPException(status_code=400, detail="Return request is not pending")
            
            if action == 'APPROVE':
                ret.status = ReturnStatus.APPROVED
                ret.status_text = 'อนุมัติ'
                ret.approved_at = now_utc()

                # ─── Stripe Refund ───
                order = ret.order
                payment = order.payment if order else None

                if payment and payment.payment_intent_id:
                    refund_amount_cents = int(float(ret.refund_amount) * 100) if ret.refund_amount else None
                    
                    # Retry loop: ลองทำ refund จนกว่าจะสำเร็จ (สูงสุด 5 ครั้ง)
                    max_retries = 5
                    refund_success = False

                    for attempt in range(1, max_retries + 1):
                        try:
                            refund_params = {
                                "payment_intent": payment.payment_intent_id,
                                "reason": "requested_by_customer"
                            }
                            # ถ้ามี refund_amount ให้ refund เฉพาะจำนวนนั้น (partial refund)
                            # ถ้าไม่มี Stripe จะ refund เต็มจำนวน
                            if refund_amount_cents and refund_amount_cents > 0:
                                refund_params["amount"] = refund_amount_cents

                            stripe_refund = stripe.Refund.create(**refund_params)
                            
                            logger.info(f"✅ Stripe refund สำเร็จ: {stripe_refund.id} (attempt {attempt})")
                            print(f"✅ Stripe refund สำเร็จ: {stripe_refund.id} | return_id={return_id} | attempt={attempt}", flush=True)

                            # อัปเดตสถานะทั้งหมด
                            ret.status = ReturnStatus.REFUNDED
                            ret.status_text = 'คืนเงินแล้ว'
                            ret.refunded_at = now_utc()

                            payment.status = PaymentStatus.REFUNDED

                            order.order_status = 'RETURNED'
                            order.order_text_status = 'คืนเงินแล้ว'
                            
                            refund_success = True
                            break  # สำเร็จแล้ว ออกจาก loop

                        except stripe.error.InvalidRequestError as e:
                            # เช่น charge already refunded, payment_intent ไม่ถูกต้อง
                            logger.error(f"❌ Stripe refund InvalidRequestError (attempt {attempt}/{max_retries}): {e}")
                            print(f"❌ Stripe refund InvalidRequestError: {e} | return_id={return_id}", flush=True)
                            # ไม่ต้อง retry กรณีนี้เพราะเป็น error ที่ retry แล้วก็ไม่สำเร็จ
                            break

                        except Exception as e:
                            logger.error(f"❌ Stripe refund error (attempt {attempt}/{max_retries}): {e}")
                            print(f"❌ Stripe refund error (attempt {attempt}/{max_retries}): {e} | return_id={return_id}", flush=True)
                            
                            if attempt < max_retries:
                                wait_time = 2 ** attempt  # exponential backoff: 2, 4, 8, 16 วินาที
                                logger.info(f"⏳ รอ {wait_time} วินาที แล้วลองใหม่...")
                                time.sleep(wait_time)
                            else:
                                logger.error(f"❌ Stripe refund ล้มเหลวทั้ง {max_retries} ครั้ง | return_id={return_id}")
                                print(f"❌ Stripe refund ล้มเหลวทั้ง {max_retries} ครั้ง | return_id={return_id}", flush=True)
                    
                    if not refund_success:
                        # อนุมัติแล้วแต่ refund ไม่สำเร็จ → ต้อง manual refund
                        order.order_status = 'APPROVED'
                        order.order_text_status = 'อนุมัติการคืนเงิน (รอ refund แบบ manual)'
                        logger.warning(f"⚠️ Return {return_id} approved but refund failed — needs manual refund")
                else:
                    # ไม่มี payment_intent_id → อนุมัติแต่ไม่สามารถ refund อัตโนมัติได้
                    order.order_status = 'APPROVED'
                    order.order_text_status = 'อนุมัติการคืนเงิน (ไม่มี payment_intent)'
                    logger.warning(f"⚠️ Return {return_id}: no payment_intent_id found, manual refund needed")
                    print(f"⚠️ Return {return_id}: ไม่มี payment_intent_id → ต้อง refund แบบ manual", flush=True)
                
            elif action == 'REJECT':
                ret.status = ReturnStatus.REJECTED
                ret.status_text = 'ปฏิเสธ'
                ret.rejected_at = now_utc()
                ret.store_note = note
                # ✅ เช็ค ret.order ก่อนใช้ (order_id อาจเป็น null)
                if ret.order:
                    ret.order.order_status = 'REJECTED'
                    ret.order.order_text_status = 'ปฏิเสธการคืนสินค้า'
                
            else:
                raise HTTPException(status_code=400, detail="Invalid action")
            
            ret.updated_at = now_utc()
            if ret.order:
                ret.order.updated_at = now_utc()
            db.commit()

            # ── notify หลัง commit เท่านั้น ──
            from app.services.notification_service import NotificationService
            if action == 'APPROVE':
                await NotificationService.notify(db, event="RETURN_APPROVED", order=ret.order)
            elif action == 'REJECT':
                await NotificationService.notify(db, event="RETURN_REJECTED", order=ret.order, store_note=note)
            
            if action == 'APPROVE':
                refund_status = 'คืนเงินสำเร็จ' if ret.status == ReturnStatus.REFUNDED else 'อนุมัติแล้ว (รอ refund)'
                return {'message': f'อนุมัติการคืนสินค้าสำเร็จ — {refund_status}'}
            return {'message': 'ปฏิเสธการคืนสินค้าสำเร็จ'}
    
    @staticmethod
    def get_seller_notifications(db: Session, store_id: str):
        """ดึงการแจ้งเตือนของร้าน"""
        notifications = db.query(SellerNotification).filter(
            SellerNotification.store_id == store_id
        ).order_by(SellerNotification.created_at.desc()).limit(50).all()
        
        return [
            {
                'notification_id': str(n.notification_id),
                'type': n.type.value,
                'title': n.title,
                'message': n.message,
                'order_id': str(n.order_id) if n.order_id else None,
                'is_read': n.is_read,
                'created_at': n.created_at.isoformat()
            } for n in notifications
        ]
    
    @staticmethod
    def mark_notification_as_read(db: Session, store_id: str, notification_id: str):
        """อ่านการแจ้งเตือน"""
        notification = db.query(SellerNotification).filter(
            SellerNotification.notification_id == notification_id,
            SellerNotification.store_id == store_id
        ).first()
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        notification.is_read = True
        notification.read_at = now_utc()
        db.commit()