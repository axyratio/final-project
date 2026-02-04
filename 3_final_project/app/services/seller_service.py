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
        
        # สินค้าขายดี Top 3
        top_products = db.query(
            Product.product_id,
            Product.product_name.label('product_name'),
            func.coalesce(func.max(ProductImage.image_url), '').label('image_url'),
            func.sum(OrderItem.quantity).label('sold_count'),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label('revenue'),
            Product.category
        ).join(OrderItem, OrderItem.product_id == Product.product_id)\
        .join(Order, Order.order_id == OrderItem.order_id)\
        .outerjoin(ProductImage, ProductImage.product_id == Product.product_id)\
        .filter(
            Product.store_id == store_id,
            Order.order_status.in_(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'COMPLETED'])
        ).group_by(Product.product_id, Product.product_name, Product.category)\
        .order_by(func.sum(OrderItem.quantity).desc())\
        .limit(3).all()
        
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
            'top_products': [
                {
                    'product_id': str(p.product_id),
                    'product_name': p.product_name,
                    'image_url': p.image_url or '',
                    'sold_count': p.sold_count,
                    'revenue': float(p.revenue),
                    'category': p.category or ''
                } for p in top_products
            ],
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
            # ดึงข้อมูลลูกค้า
            user = db.query(User).filter(User.user_id == order.user_id).first()

            # ดึงที่อยู่จัดส่ง
            shipping_addr = db.query(ShippingAddress).filter(
                ShippingAddress.ship_addr_id == order.ship_addr_id
            ).first()

            # build order_items
            order_items = []
            for item in order.order_items:
                product = getattr(item, 'product', None)
                variant = getattr(item, 'variant', None)

                # product name
                product_name = getattr(product, 'product_name', None) if product else None

                # variant name fallback
                variant_name = None
                if variant and getattr(variant, 'name_option', None):
                    variant_name = variant.name_option
                elif product and getattr(product, 'variant_name', None):
                    variant_name = product.variant_name
                else:
                    variant_name = ''

                # determine image_url (main or first)
                image_url = None
                if product and getattr(product, 'images', None):
                    # look for is_main first
                    main_img = next((img for img in product.images if getattr(img, 'is_main', False)), None)
                    if main_img and getattr(main_img, 'image_url', None):
                        image_url = main_img.image_url
                    else:
                        first_img = product.images[0] if product.images else None
                        image_url = getattr(first_img, 'image_url', None)

                order_items.append({
                    'order_item_id': str(item.order_item_id),
                    'product_id': str(item.product_id),
                    'product_name': product_name or '',
                    'variant_name': variant_name or '',
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
    def confirm_order_shipped(
        db: Session, 
        store_id: str, 
        order_id: str, 
        tracking_number: str, 
        courier_name: str
    ):
        """ยืนยันการจัดส่งสินค้า"""
        order = db.query(Order).filter(
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

        # 2. 🔥 เรียกใช้ Celery Task ตรงนี้!
        # สมมติว่าอยากให้จำลองการส่งสำเร็จในอีก 10 วินาที
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
            user = db.query(User).filter(User.user_id == ret.user_id).first()
            
            result.append({
                'return_id': str(ret.return_id),
                'order_id': str(ret.order_id),
                'customer_name': f"{user.first_name} {user.last_name}" if user else 'Unknown',
                'reason': ret.reason.value,
                'reason_detail': ret.reason_detail,
                'image_urls': ret.image_urls or [],
                'status': ret.status.value,
                'status_text': ret.status_text,
                'refund_amount': float(ret.refund_amount) if ret.refund_amount else 0,
                'created_at': ret.created_at.isoformat(),
                'order_items': [
                    {
                        'product_name': item.product.product_name if getattr(item, 'product', None) else '',
                        'variant_name': (item.variant.name_option if getattr(item, 'variant', None) and getattr(item.variant, 'name_option', None) else (item.product.variant_name if getattr(item, 'product', None) and getattr(item.product, 'variant_name', None) else '')) or '',
                        'quantity': item.quantity,
                        'unit_price': float(item.unit_price)
                    } for item in ret.order.order_items
                ]
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
            """อนุมัติหรือปฏิเสธคำขอคืนสินค้า และอัปเดตสถานะออเดอร์หลัก"""
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
                ret.order.order_status = 'APPROVED'
                ret.order.order_text_status = 'อนุมัติการคืนเงิน'
                
            elif action == 'REJECT':
                ret.status = ReturnStatus.REJECTED
                ret.status_text = 'ปฏิเสธ'
                ret.rejected_at = now_utc()
                ret.store_note = note
                ret.order.order_status = 'REJECTED'
                ret.order.order_text_status = 'ปฏิเสธการคืนสินค้า'
                
            else:
                raise HTTPException(status_code=400, detail="Invalid action")
            
            ret.updated_at = now_utc()
            ret.order.updated_at = now_utc()
            db.commit()

            # ── notify หลัง commit เท่านั้น ──
            if action == 'APPROVE':
                from app.services.notification_service import NotificationService
                await NotificationService.notify_return_approved(db, ret.order)
            
            message = 'อนุมัติการคืนสินค้าสำเร็จ' if action == 'APPROVE' else 'ปฏิเสธการคืนสินค้าสำเร็จ'
            return {'message': message}
    
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
