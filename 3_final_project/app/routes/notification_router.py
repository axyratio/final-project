# app/routes/notification_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/me", response_model=NotificationListResponse)
async def get_my_notifications(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """ดึงการแจ้งเตือนของฉัน"""
    notifications, total = await NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.user_id,
        limit=limit,
        offset=offset
    )
    
    unread_count = await NotificationService.get_unread_count(
        db=db,
        user_id=current_user.user_id
    )
    
    return {
        "notifications": notifications,
        "total": total,
        "unread_count": unread_count
    }


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน"""
    unread_count = await NotificationService.get_unread_count(
        db=db,
        user_id=current_user.user_id
    )
    
    return {"unread_count": unread_count}


@router.get("/badge-count", response_model=UnreadCountResponse)
async def get_badge_count(
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """ดึง badge count ของการแจ้งเตือนที่ยังไม่อ่าน"""
    unread_count = await NotificationService.get_unread_count(
        db=db,
        user_id=current_user.user_id
    )
    
    return {"unread_count": unread_count}


@router.post("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: UUID,
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """ทำเครื่องหมายว่าอ่านแล้ว"""
    success = await NotificationService.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.user_id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Marked as read"}


@router.post("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว"""
    updated = await NotificationService.mark_all_as_read(
        db=db,
        user_id=current_user.user_id
    )
    
    return {"message": f"Marked {updated} notifications as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """ลบการแจ้งเตือน"""
    success = await NotificationService.delete_notification(
        db=db,
        notification_id=notification_id,
        user_id=current_user.user_id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted"}
