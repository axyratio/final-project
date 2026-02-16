# app/services/email_service.py
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    ส่งอีเมลผ่าน SMTP
    รองรับ: Gmail, Outlook, Mailtrap, หรือ SMTP อื่น ๆ
    """
    smtp_host = getattr(settings, "SMTP_HOST", None)
    smtp_port = int(getattr(settings, "SMTP_PORT", 587))
    smtp_user = getattr(settings, "SMTP_USER", None)
    smtp_pass = getattr(settings, "SMTP_PASSWORD", None)
    from_email = getattr(settings, "SMTP_FROM_EMAIL", smtp_user)
    from_name = getattr(settings, "SMTP_FROM_NAME", "ClosetX")

    if not smtp_host or not smtp_user or not smtp_pass:
        print("⚠️ SMTP not configured — email not sent")
        print(f"   To: {to_email}")
        print(f"   Subject: {subject}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        msg.attach(MIMEText(html_body, "html", "utf-8"))

        # เชื่อมต่อ SMTP
        if smtp_port == 465:
            # SSL
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_email, to_email, msg.as_string())
        else:
            # STARTTLS (587)
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_email, to_email, msg.as_string())

        print(f"✅ Email sent to {to_email}")
        return True

    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        return False


def send_password_reset_email(to_email: str, reset_url: str, user_name: str = "") -> bool:
    """
    ส่งอีเมล reset password พร้อม HTML template สวย ๆ
    """
    display_name = user_name or to_email

    html = f"""
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f3f4f6; font-family:'Sarabun',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background:linear-gradient(135deg,#7c3aed,#6d28d9); padding:32px 30px; text-align:center;">
                                <div style="font-size:32px; margin-bottom:8px;">🔒</div>
                                <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700;">
                                    รีเซ็ตรหัสผ่าน
                                </h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:32px 30px;">
                                <p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.7;">
                                    สวัสดีคุณ <strong>{display_name}</strong>,
                                </p>
                                <p style="margin:0 0 24px; color:#6b7280; font-size:14px; line-height:1.7;">
                                    เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่
                                </p>

                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="padding:8px 0 24px;">
                                            <a href="{reset_url}" 
                                               style="display:inline-block; background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#ffffff; text-decoration:none; padding:14px 40px; border-radius:10px; font-size:16px; font-weight:600; letter-spacing:0.3px;">
                                                ตั้งรหัสผ่านใหม่
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Expiry Warning -->
                                <div style="background-color:#fef3c7; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:0 8px 8px 0; margin-bottom:24px;">
                                    <p style="margin:0; color:#92400e; font-size:13px;">
                                        ⏳ ลิงก์นี้จะหมดอายุใน <strong>30 นาที</strong> และใช้ได้เพียงครั้งเดียว
                                    </p>
                                </div>

                                <!-- Fallback URL -->
                                <p style="margin:0 0 8px; color:#9ca3af; font-size:12px;">
                                    หากปุ่มไม่ทำงาน คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:
                                </p>
                                <p style="margin:0 0 24px; word-break:break-all; color:#7c3aed; font-size:12px;">
                                    {reset_url}
                                </p>

                                <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" />

                                <p style="margin:0; color:#9ca3af; font-size:12px; line-height:1.6;">
                                    หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้ รหัสผ่านของคุณจะไม่เปลี่ยนแปลง
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color:#f9fafb; padding:20px 30px; text-align:center; border-top:1px solid #f3f4f6;">
                                <p style="margin:0; color:#9ca3af; font-size:12px;">
                                    © 2025 ClosetX — ระบบอัตโนมัติ อย่าตอบกลับอีเมลนี้
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    return send_email(
        to_email=to_email,
        subject="🔒 รีเซ็ตรหัสผ่าน — ClosetX",
        html_body=html,
    )