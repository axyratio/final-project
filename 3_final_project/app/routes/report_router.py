# app/routes/report_router.py
"""
Report Router - ระบบรายงาน
"""
from fastapi import APIRouter, Depends, Query, Form, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.schemas.report import (
    CreateReportRequest,
    UpdateReportStatusRequest,
    ReportFilterParams,
    ReportType,
    ReportReason,
    ReportStatus,
)
from app.services.report_service import (
    create_report_service,
    get_all_reports_service,
    get_report_detail_service,
    update_report_status_service,
    get_report_statistics_service,
)
from app.utils.response_handler import success_response, error_response


router = APIRouter(prefix="/reports", tags=["Reports"])


# ==================== Public Routes ====================

@router.post(
    "",
    summary="สร้างรายงาน",
    description="ผู้ใช้/ร้านค้า สร้างรายงาน"
)
def create_report(
    report_type: str = Form(..., description="user หรือ store"),
    reported_id: str = Form(..., description="ID ของผู้ถูกรายงาน"),
    reason: str = Form(..., description="เหตุผล"),
    description: str = Form(..., description="รายละเอียด"),
    image_urls: str = Form("[]", description="JSON array ของ image URLs"),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **สร้างรายงาน**
    
    - report_type: "user" หรือ "store"
    - reported_id: user_id หรือ store_id
    - reason: spam, harassment, inappropriate, scam, fake, copyright, other
    - description: รายละเอียดอย่างน้อย 10 ตัวอักษร
    - image_urls: JSON array เช่น ["url1", "url2"]
    """
    try:
        import json
        image_urls_list = json.loads(image_urls) if image_urls else []
        
        data = CreateReportRequest(
            report_type=ReportType(report_type),
            reported_id=reported_id,
            reason=ReportReason(reason),
            description=description,
            image_urls=image_urls_list
        )
        
        result, error = create_report_service(
            db,
            str(auth_user.user_id),
            data
        )
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response("สร้างรายงานสำเร็จ", result)
        
    except Exception as e:
        print(f"❌ [create_report] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


# ==================== Admin Routes ====================

@router.get(
    "",
    summary="ดึงรายการรายงานทั้งหมด (Admin)",
    description="Admin ดูรายการรายงานทั้งหมด"
)
def get_all_reports(
    report_type: Optional[str] = Query(None, description="user/store"),
    status: Optional[str] = Query(None, description="pending/reviewing/resolved/rejected"),
    reason: Optional[str] = Query(None, description="spam/harassment/..."),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **ดึงรายการรายงานทั้งหมด (Admin only)**
    
    - รองรับการกรองตามประเภท, สถานะ, เหตุผล
    - รองรับ pagination
    """
    try:
        # ตรวจสอบ admin
        if not auth_user.role or auth_user.role.role_name.upper() != "ADMIN":
            return error_response("ไม่มีสิทธิ์เข้าถึง", {}, 403)
        
        params = ReportFilterParams(
            report_type=ReportType(report_type) if report_type else None,
            status=ReportStatus(status) if status else None,
            reason=ReportReason(reason) if reason else None,
            skip=skip,
            limit=limit
        )
        
        data, error = get_all_reports_service(db, params)
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response("ดึงรายการรายงานสำเร็จ", data)
        
    except Exception as e:
        print(f"❌ [get_all_reports] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get(
    "/statistics",
    summary="สถิติรายงาน (Admin)",
    description="Admin ดูสถิติรายงาน"
)
def get_report_statistics(
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """**สถิติรายงาน (Admin only)**"""
    try:
        if not auth_user.role or auth_user.role.role_name.upper() != "ADMIN":
            return error_response("ไม่มีสิทธิ์เข้าถึง", {}, 403)
        
        data, error = get_report_statistics_service(db)
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response("ดึงสถิติสำเร็จ", data)
        
    except Exception as e:
        print(f"❌ [get_report_statistics] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get(
    "/{report_id}",
    summary="ดูรายละเอียดรายงาน (Admin)",
    description="Admin ดูรายละเอียดรายงาน"
)
def get_report_detail(
    report_id: str,
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """**ดูรายละเอียดรายงาน (Admin only)**"""
    try:
        if not auth_user.role or auth_user.role.role_name.upper() != "ADMIN":
            return error_response("ไม่มีสิทธิ์เข้าถึง", {}, 403)
        
        data, error = get_report_detail_service(db, report_id)
        
        if error:
            return error_response(error, {}, 404 if error == "ไม่พบรายงาน" else 400)
        
        return success_response("ดึงข้อมูลสำเร็จ", data)
        
    except Exception as e:
        print(f"❌ [get_report_detail] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.patch(
    "/{report_id}/status",
    summary="อัปเดตสถานะรายงาน (Admin)",
    description="Admin อัปเดตสถานะรายงาน"
)
def update_report_status(
    report_id: str,
    status: str = Form(..., description="pending/reviewing/resolved/rejected"),
    admin_note: Optional[str] = Form(None, description="หมายเหตุ"),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **อัปเดตสถานะรายงาน (Admin only)**
    
    - status: pending, reviewing, resolved, rejected
    - admin_note: หมายเหตุจาก Admin (optional)
    """
    try:
        if not auth_user.role or auth_user.role.role_name.upper() != "ADMIN":
            return error_response("ไม่มีสิทธิ์เข้าถึง", {}, 403)
        
        data = UpdateReportStatusRequest(
            status=ReportStatus(status),
            admin_note=admin_note
        )
        
        result, error = update_report_status_service(
            db,
            report_id,
            str(auth_user.user_id),
            data
        )
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response("อัปเดตสถานะสำเร็จ", result)
        
    except Exception as e:
        print(f"❌ [update_report_status] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)