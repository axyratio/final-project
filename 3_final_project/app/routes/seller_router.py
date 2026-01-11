# app/routes/seller_router.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.models.store import Store
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
    print(f"[DEBUG] {current_user}")
    store = get_user_store(db, str(current_user.user_id))
    
    result = SellerService.handle_return_request(
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
    print(f"[REJECT] store: {store}")
    
    result = SellerService.handle_return_request(
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