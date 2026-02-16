# app/routes/forgot_password_router.py
import os
from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.forgot_password import ForgotPasswordRequest, ResetPasswordRequest
from app.services.forgot_password_service import (
    request_password_reset,
    validate_reset_token,
    reset_password,
)
from app.utils.response_handler import success_response, error_response
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ─── โหลด HTML templates ───
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "templates/forgotpassword")


def _load_template(filename: str) -> str:
    filepath = os.path.join(TEMPLATE_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    ขอ reset link
    - Rate limit: 3 ครั้ง/ชม. ต่อ email
    - ตอบ success เสมอเพื่อกัน email enumeration
    - ส่งอีเมลจริงพร้อมลิงก์
    """
    result = request_password_reset(db, payload.email)

    if not result.get("success"):
        return error_response(result["message"])

    data = {
        "message": result["message"],
        "email_sent": result.get("email_sent", False),
    }

    return success_response(result["message"], data)


@router.get("/reset-password", response_class=HTMLResponse)
def show_reset_form(token: str = Query(...), db: Session = Depends(get_db)):
    """
    แสดง HTML form สำหรับกรอกรหัสผ่านใหม่
    - ตรวจ token ก่อนแสดง form
    - ถ้า token ไม่ valid → แสดง error page
    """
    result = validate_reset_token(db, token)

    if not result.get("valid"):
        error_html = f"""
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ลิงก์ไม่ถูกต้อง</title>
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{
                    font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }}
                .card {{
                    background: white;
                    border-radius: 16px;
                    padding: 40px;
                    max-width: 420px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                    text-align: center;
                }}
                .icon {{ font-size: 48px; margin-bottom: 16px; }}
                h1 {{ font-size: 22px; color: #dc2626; margin-bottom: 12px; }}
                p {{ color: #6b7280; line-height: 1.6; }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">❌</div>
                <h1>{result['error']}</h1>
                <p>กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่อีกครั้ง</p>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=400)

    # ─── Token valid → โหลด form template ───
    html_template = _load_template("index.html")
    html_content = html_template.format(token=token)
    return HTMLResponse(content=html_content)


@router.post("/reset-password")
def do_reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    อัปเดตรหัสผ่านใหม่
    - ตรวจ token valid + not expired + not used
    - hash password ใหม่
    - mark token as used (single use)
    """
    result = reset_password(db, payload.token, payload.new_password)

    if not result.get("success"):
        return error_response(result["message"])

    return success_response(result["message"])