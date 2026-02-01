# File: app/routes/admin_category_router.py

from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.authz import authenticate_token, authorize_role
from app.services import category_service

router = APIRouter(prefix="/admin/categories", tags=["Admin - Categories"])


@router.post("")
def create_category(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["admin"]))
):
    """
    สร้างหมวดหมู่ใหม่ (เฉพาะ Admin)
    
    Body:
    {
        "name": "เสื้อยืด",
        "slug": "tshirt"
    }
    """
    return category_service.create_category_service(db, data)


@router.get("")
def get_all_categories(
    active_only: bool = True,
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["admin"]))
):
    """
    ดึงหมวดหมู่ทั้งหมด (เฉพาะ Admin)
    
    Query Params:
    - active_only: true = เฉพาะที่ active, false = ทั้งหมด
    """
    return category_service.get_all_categories_service(db, active_only)


@router.get("/{category_id}")
def get_category_by_id(
    category_id: str,
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["admin"]))
):
    """
    ดึงข้อมูลหมวดหมู่ตาม ID (เฉพาะ Admin)
    """
    return category_service.get_category_by_id_service(db, category_id)


@router.patch("/{category_id}")
def update_category(
    category_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["admin"]))
):
    """
    อัพเดทหมวดหมู่ (เฉพาะ Admin)
    
    Body (ส่งเฉพาะที่ต้องการแก้):
    {
        "name": "เสื้อยืด V2",
        "slug": "tshirt-v2",
        "is_active": false
    }
    """
    return category_service.update_category_service(db, category_id, data)


@router.delete("/{category_id}")
def delete_category(
    category_id: str,
    hard_delete: bool = False,
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["admin"]))
):
    """
    ลบหมวดหมู่ (เฉพาะ Admin)
    
    Query Params:
    - hard_delete: true = ลบถาวร, false = soft delete (ปิดการใช้งาน)
    """
    return category_service.delete_category_service(db, category_id, hard_delete)