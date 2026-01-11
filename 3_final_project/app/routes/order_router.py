# app/routes/order_router.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.services.order_service import OrderService
from app.utils.response_handler import success_response

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)


@router.get("/me")
def get_user_orders(
    status: Optional[str] = Query(None, description="Filter by order status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    ดึงรายการคำสั่งซื้อทั้งหมดของผู้ใช้
    - สามารถกรองตาม status ได้
    """
    orders = OrderService.get_user_orders(db, current_user.user_id, status)
    
    return success_response(
        message="ดึงรายการคำสั่งซื้อสำเร็จ",
        data={
            "orders": orders,
            "total": len(orders)
        }
    )


@router.get("/{order_id}")
def get_order_detail(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    ดึงรายละเอียดคำสั่งซื้อ
    """
    order = OrderService.get_order_detail(db, order_id, current_user.user_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="ไม่พบคำสั่งซื้อ")
    
    return success_response(
        message="ดึงรายละเอียดคำสั่งซื้อสำเร็จ",
        data=order
    )


@router.post("/{order_id}/confirm-received")
def confirm_order_received(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    ยืนยันว่าได้รับสินค้าแล้ว
    - เปลี่ยนสถานะจาก DELIVERED -> COMPLETED
    - ตั้งค่า completed_at
    - เปิดให้รีวิวสินค้าได้
    """
    order = OrderService.confirm_order_received(db, order_id, current_user.user_id)
    
    return success_response(
        message="ยืนยันการรับสินค้าสำเร็จ",
        data=order
    )


@router.post("/{order_id}/reorder")
def reorder_items(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    ซื้ออีกครั้ง - เพิ่มสินค้าจาก order เข้าตะกร้า
    """
    result = OrderService.reorder_items(db, order_id, current_user.user_id)
    
    return success_response(
        message="เพิ่มสินค้าเข้าตะกร้าสำเร็จ",
        data=result
    )