# app/routes/seller_router.py
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.order import Order
from app.models.return_order import ReturnOrder, ReturnStatus
from app.models.seller_notification import SellerNotification
from app.models.user import User
from app.models.store import Store
from app.services.order_service import OrderService
from app.services.seller_service import SellerService
from app.schemas.seller import ConfirmShipmentRequest, HandleReturnRequest

router = APIRouter(prefix="/seller", tags=["Seller"])


def get_user_store(db: Session, user_id: str) -> Store:
    """ตรวจสอบว่า user มีร้านค้าหรือไม่"""
    print(f"[USER] get_user_store for user_id: {user_id}")
    store = db.query(Store).filter(Store.user_id == user_id).first()
    if not store:
        raise HTTPException(status_code=403, detail="You don't have a store")
    return store


@router.get("/dashboard", response_model=dict)
async def get_seller_dashboard(
    month: Optional[str] = Query(None, description="YYYY-MM format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """
    ดึงข้อมูล Dashboard สำหรับร้านค้า
    
    - **month**: เดือนที่ต้องการดูข้อมูล (YYYY-MM) ถ้าไม่ระบุจะใช้เดือนปัจจุบัน
    """
    store = get_user_store(db, str(current_user.user_id))
    
    dashboard_data = SellerService.get_seller_dashboard(
        db=db,
        store_id=str(store.store_id),
        month=month
    )
    
    return {"data": dashboard_data}


@router.get("/orders", response_model=dict)
async def get_seller_orders(
    status: Optional[str] = Query(None, description="Filter by order status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """
    ดึงรายการออเดอร์ของร้าน
    
    - **status**: กรองตามสถานะ (PREPARING, SHIPPED, DELIVERED, COMPLETED)
    """
    store = get_user_store(db, str(current_user.user_id))
    
    orders = SellerService.get_seller_orders(
        db=db,
        store_id=str(store.store_id),
        status=status
    )
    
    return {"data": {"orders": orders}}


@router.post("/orders/{order_id}/approve", response_model=dict)
async def approve_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """
    อนุมัติออเดอร์ (PAID → PREPARING)
    → เรียก OrderService.update_order_status_with_notification
      → notify_order_approved → broadcast ws room "user:<user_id>"
    """
    print(f"\n{'='*80}")
    print(f"[SELLER_ROUTER] 🎯 approve_order CALLED")
    print(f"[SELLER_ROUTER] order_id: {order_id}")
    print(f"[SELLER_ROUTER] current_user: {current_user.email} (user_id: {current_user.user_id})")
    print(f"{'='*80}\n")
    
    try:
        store = get_user_store(db, str(current_user.user_id))
        print(f"[SELLER_ROUTER] ✅ Store found: {store.store_id} - {store.name}")
    except Exception as e:
        print(f"[SELLER_ROUTER] ❌ Failed to get store: {e}")
        raise

    # ตรวจว่า order นี้เป็นของ store นี้จริง
    order = db.query(Order).filter(
        Order.order_id == order_id,
        Order.store_id == str(store.store_id)
    ).first()
    
    if not order:
        print(f"[SELLER_ROUTER] ❌ Order not found or not belongs to this store")
        print(f"[SELLER_ROUTER] Searched for: order_id={order_id}, store_id={store.store_id}")
        raise HTTPException(status_code=404, detail="Order not found")
    
    print(f"[SELLER_ROUTER] ✅ Order found:")
    print(f"  - order_id: {order.order_id}")
    print(f"  - current status: {order.order_status}")
    print(f"  - user_id (buyer): {order.user_id}")
    print(f"  - store_id: {order.store_id}")
    
    if order.order_status != 'PAID':
        print(f"[SELLER_ROUTER] ❌ Cannot approve. Status is '{order.order_status}', expected 'PAID'")
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve. Current status: {order.order_status}"
        )

    print(f"\n[SELLER_ROUTER] 🚀 Calling OrderService.update_order_status_with_notification...")
    print(f"[SELLER_ROUTER] Parameters:")
    print(f"  - order_id: {order.order_id}")
    print(f"  - new_status: PREPARING")
    
    try:
        result = await OrderService.update_order_status_with_notification(
            db=db,
            order_id=order.order_id,
            new_status="PREPARING"
        )
        
        print(f"\n[SELLER_ROUTER] ✅ OrderService returned successfully")
        print(f"[SELLER_ROUTER] Result: {result}")
        print(f"{'='*80}\n")
        
        return {"data": result, "message": "อนุมัติออเดอร์สำเร็จ"}
        
    except Exception as e:
        print(f"\n[SELLER_ROUTER] ❌ OrderService failed: {e}")
        print(f"[SELLER_ROUTER] Exception type: {type(e).__name__}")
        import traceback
        print(f"[SELLER_ROUTER] Traceback:\n{traceback.format_exc()}")
        raise


@router.post("/orders/{order_id}/cancel", response_model=dict)
async def cancel_order(
    order_id: str,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """
    ยกเลิกออเดอร์โดยร้านค้า
    → เรียก OrderService.update_order_status_with_notification(CANCELLED)
      → notify_order_cancelled_by_store → broadcast ws room "user:<user_id>"
    
    สามารถยกเลิกได้เฉพาะ:
    - PAID (ยังไม่เริ่มเตรียม)
    - PREPARING (กำลังเตรียม)
    """
    print(f"\n{'='*80}")
    print(f"[SELLER_ROUTER] 🎯 cancel_order CALLED")
    print(f"[SELLER_ROUTER] order_id: {order_id}")
    print(f"[SELLER_ROUTER] reason: {reason}")
    print(f"{'='*80}\n")
    
    store = get_user_store(db, str(current_user.user_id))

    # ตรวจสอบ order
    order = db.query(Order).filter(
        Order.order_id == order_id,
        Order.store_id == str(store.store_id)
    ).first()
    
    if not order:
        print(f"[SELLER_ROUTER] ❌ Order not found")
        raise HTTPException(status_code=404, detail="Order not found")
    
    print(f"[SELLER_ROUTER] Current status: {order.order_status}")
    
    # ตรวจสอบสถานะว่าสามารถยกเลิกได้หรือไม่
    if order.order_status not in ['PAID', 'PREPARING']:
        print(f"[SELLER_ROUTER] ❌ Cannot cancel order with status: {order.order_status}")
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel order with status: {order.order_status}"
        )

    # ใช้ OrderService.update_order_status_with_notification
    result = await OrderService.update_order_status_with_notification(
        db=db,
        order_id=order.order_id,
        new_status="CANCELLED",
        note=reason
    )
    
    print(f"[SELLER_ROUTER] ✅ Order cancelled successfully")

    return {
        "data": result,
        "message": "ยกเลิกออเดอร์สำเร็จ"
    }


@router.post("/orders/{order_id}/ship", response_model=dict)
async def confirm_order_shipped(
    order_id: str,
    body: ConfirmShipmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """
    ยืนยันการจัดส่งสินค้าและเพิ่ม tracking number
    
    - **order_id**: รหัสออเดอร์
    - **tracking_number**: เลขพัสดุ
    - **courier_name**: ชื่อบริษัทขนส่ง
    """
    store = get_user_store(db, str(current_user.user_id))
    
    result = SellerService.confirm_order_shipped(
        db=db,
        store_id=str(store.store_id),
        order_id=order_id,
        tracking_number=body.tracking_number,
        courier_name=body.courier_name
    )
    
    return result


@router.get("/returns", response_model=dict)
async def get_return_requests(
    status: Optional[str] = Query(None, description="Filter by return status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """
    ดึงรายการคำขอคืนสินค้า
    
    - **status**: กรองตามสถานะ (PENDING, APPROVED, REJECTED)
    """
    store = get_user_store(db, str(current_user.user_id))
    
    returns = SellerService.get_return_requests(
        db=db,
        store_id=str(store.store_id),
        status=status
    )
    
    return {"data": {"returns": returns}}


@router.post("/returns/{return_id}/approve", response_model=dict)
async def approve_return_request(
    return_id: str,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """อนุมัติคำขอคืนสินค้า"""
    store = get_user_store(db, str(current_user.user_id))
    
    result = await SellerService.handle_return_request(
        db=db,
        store_id=str(store.store_id),
        return_id=return_id,
        action='APPROVE',
        note=note
    )
    
    return result


@router.post("/returns/{return_id}/reject", response_model=dict)
async def reject_return_request(
    return_id: str,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """ปฏิเสธคำขอคืนสินค้า"""
    store = get_user_store(db, str(current_user.user_id))
    
    result = await SellerService.handle_return_request(
        db=db,
        store_id=str(store.store_id),
        return_id=return_id,
        action='REJECT',
        note=note
    )
    
    return result


@router.get("/notifications", response_model=dict)
async def get_seller_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """ดึงการแจ้งเตือนของร้าน"""
    store = get_user_store(db, str(current_user.user_id))
    
    notifications = SellerService.get_seller_notifications(
        db=db,
        store_id=str(store.store_id)
    )
    
    return {"data": {"notifications": notifications}}


@router.post("/notifications/{notification_id}/read", response_model=dict)
async def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """ทำเครื่องหมายว่าอ่านแล้ว"""
    store = get_user_store(db, str(current_user.user_id))
    
    SellerService.mark_notification_as_read(
        db=db,
        store_id=str(store.store_id),
        notification_id=notification_id
    )
    
    return {"message": "Notification marked as read"}


@router.get("/badge-counts", response_model=dict)
async def get_seller_badge_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """
    ดึงข้อมูล Badge Counts และ Store ID สำหรับหน้า Seller Menu
    
    Returns:
        - store_id: รหัสร้านค้า
        - unread_notifications: จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
        - preparing_orders: จำนวนออเดอร์ที่กำลังเตรียม
        - pending_returns: จำนวนคำขอคืนสินค้าที่รอดำเนินการ
        - unread_chats: จำนวนแชทที่ยังไม่ได้อ่าน
    """
    store = get_user_store(db, str(current_user.user_id))
    
    badge_counts = SellerService.get_badge_counts(
        db=db,
        store_id=str(store.store_id)
    )
    
    return {
        "data": {
            "store_id": str(store.store_id),
            **badge_counts
        }
    }


# ========================================
# FILE 2: app/services/seller_service.py
# เพิ่ม static method ใหม่
# ========================================

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
    from app.models.chat_conversation import ChatConversation
    
    # 1. นับการแจ้งเตือนที่ยังไม่ได้อ่าน
    unread_notifications = db.query(func.count(SellerNotification.notification_id)).filter(
        SellerNotification.store_id == store_id,
        SellerNotification.is_read == False
    ).scalar() or 0
    
    # 2. นับออเดอร์ที่กำลังเตรียม
    preparing_orders = db.query(func.count(Order.order_id)).filter(
        Order.store_id == store_id,
        Order.order_status == 'PREPARING'
    ).scalar() or 0
    
    # 3. นับคำขอคืนสินค้าที่รอดำเนินการ
    pending_returns = db.query(func.count(ReturnOrder.return_id)).join(
        Order, Order.order_id == ReturnOrder.order_id
    ).filter(
        Order.store_id == store_id,
        ReturnOrder.status == ReturnStatus.PENDING
    ).scalar() or 0
    
    # 4. นับแชทที่ยังไม่ได้อ่าน (ข้อความล่าสุดเป็นของลูกค้า และร้านยังไม่ได้อ่าน)
    unread_chats = db.query(func.count(func.distinct(ChatConversation.conversation_id))).filter(
        ChatConversation.store_id == store_id,
        ChatConversation.last_message_from == 'USER',
        ChatConversation.store_unread_count > 0
    ).scalar() or 0
    
    return {
        'unread_notifications': unread_notifications,
        'preparing_orders': preparing_orders,
        'pending_returns': pending_returns,
        'unread_chats': unread_chats
    }
    






# ── แก้ 2: เพิ่ม endpoint อนุมัติออเดอร์ ──
# เดิมไม่มี endpoint นี้เลย ทำให้ PAID → PREPARING ไม่มี notify

@router.post("/orders/{order_id}/approve", response_model=dict)
async def approve_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """
    อนุมัติออเดอร์ (เปลี่ยน PAID → PREPARING)
    → เรียก OrderService.update_order_status_with_notification
      → notify_order_approved → broadcast ws room "user:<user_id>"
    """
    store = get_user_store(db, str(current_user.user_id))

    # ตรวจว่า order นี้เป็นของ store นี้จริง
    order = db.query(Order).filter(
        Order.order_id == order_id,
        Order.store_id == str(store.store_id)
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.order_status != 'PAID':
        raise HTTPException(status_code=400, detail=f"Cannot approve. Current status: {order.order_status}")

    result = await OrderService.update_order_status_with_notification(
        db=db,
        order_id=order.order_id,
        new_status="PREPARING"
    )

    return {"data": result, "message": "อนุมัติออเดอร์สำเร็จ"}


# ========================================
# FILE 3: app/schemas/seller.py
# เพิ่ม schema ใหม่
# ========================================

class BadgeCountsResponse(BaseModel):
    store_id: str
    unread_notifications: int
    preparing_orders: int
    pending_returns: int
    unread_chats: int