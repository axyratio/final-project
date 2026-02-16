# app/routes/forgot_password_router.py
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


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    ขอ reset link
    - Rate limit: 3 ครั้ง/ชม. ต่อ email
    - ตอบ success เสมอเพื่อกัน email enumeration
    """
    result = request_password_reset(db, payload.email)

    if not result.get("success"):
        return error_response(result["message"])

    # DEV: return token ให้ดูใน response (production ส่งอีเมลจริง)
    data = {"message": result["message"]}
    if result.get("reset_token"):
        data["reset_token"] = result["reset_token"]
        data["reset_url"] = f"{settings.BASE_URL}/auth/reset-password?token={result['reset_token']}"

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
        return HTMLResponse(content=f"""
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
        """, status_code=400)

    # Token valid → แสดง form
    return HTMLResponse(content=f"""
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>รีเซ็ตรหัสผ่าน</title>
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
            }}
            .icon {{ font-size: 48px; text-align: center; margin-bottom: 16px; }}
            h1 {{ font-size: 22px; color: #1f2937; text-align: center; margin-bottom: 8px; }}
            .subtitle {{ color: #6b7280; text-align: center; margin-bottom: 24px; font-size: 14px; }}
            label {{ display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 6px; }}
            input {{
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                font-size: 16px;
                outline: none;
                transition: border-color 0.2s;
                margin-bottom: 16px;
            }}
            input:focus {{ border-color: #7c3aed; }}
            .hint {{ font-size: 12px; color: #9ca3af; margin-top: -12px; margin-bottom: 16px; }}
            button {{
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #7c3aed, #6d28d9);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.1s, opacity 0.2s;
            }}
            button:hover {{ opacity: 0.9; }}
            button:active {{ transform: scale(0.98); }}
            button:disabled {{ opacity: 0.5; cursor: not-allowed; }}
            .error {{ color: #dc2626; font-size: 13px; margin-bottom: 12px; display: none; }}
            .success-card {{ text-align: center; display: none; }}
            .success-card .icon {{ color: #10b981; }}
            .success-card h1 {{ color: #10b981; }}
        </style>
    </head>
    <body>
        <div class="card" id="form-card">
            <div class="icon">🔒</div>
            <h1>ตั้งรหัสผ่านใหม่</h1>
            <p class="subtitle">กรุณากรอกรหัสผ่านใหม่ของคุณ</p>

            <div id="error-msg" class="error"></div>

            <label for="password">รหัสผ่านใหม่</label>
            <input type="password" id="password" placeholder="รหัสผ่านใหม่" />
            <p class="hint">8-20 ตัว, ต้องมีตัวพิมพ์ใหญ่ เล็ก ตัวเลข อักขระพิเศษ</p>

            <label for="confirm">ยืนยันรหัสผ่าน</label>
            <input type="password" id="confirm" placeholder="ยืนยันรหัสผ่าน" />

            <button id="submit-btn" onclick="handleSubmit()">เปลี่ยนรหัสผ่าน</button>
        </div>

        <div class="card success-card" id="success-card">
            <div class="icon">✅</div>
            <h1>เปลี่ยนรหัสผ่านสำเร็จ</h1>
            <p class="subtitle">คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว</p>
        </div>

        <script>
            async function handleSubmit() {{
                const password = document.getElementById('password').value;
                const confirm = document.getElementById('confirm').value;
                const errorEl = document.getElementById('error-msg');
                const btn = document.getElementById('submit-btn');

                errorEl.style.display = 'none';

                if (!password || !confirm) {{
                    errorEl.textContent = 'กรุณากรอกข้อมูลให้ครบ';
                    errorEl.style.display = 'block';
                    return;
                }}
                if (password !== confirm) {{
                    errorEl.textContent = 'รหัสผ่านไม่ตรงกัน';
                    errorEl.style.display = 'block';
                    return;
                }}

                btn.disabled = true;
                btn.textContent = 'กำลังดำเนินการ...';

                try {{
                    const res = await fetch('/auth/reset-password', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{ token: '{token}', new_password: password }})
                    }});
                    const data = await res.json();

                    if (data.success) {{
                        document.getElementById('form-card').style.display = 'none';
                        document.getElementById('success-card').style.display = 'block';
                    }} else {{
                        errorEl.textContent = data.message || 'เกิดข้อผิดพลาด';
                        errorEl.style.display = 'block';
                        btn.disabled = false;
                        btn.textContent = 'เปลี่ยนรหัสผ่าน';
                    }}
                }} catch (err) {{
                    errorEl.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
                    errorEl.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'เปลี่ยนรหัสผ่าน';
                }}
            }}
        </script>
    </body>
    </html>
    """)


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