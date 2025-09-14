import os
from typing import Optional

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
DEFAULT_FROM_EMAIL = os.getenv("FROM_EMAIL", "no-reply@example.com")

def send_email_sendgrid(to_email: str, subject: str, content: str) -> Optional[str]:
    """
    ส่งอีเมลผ่าน SendGrid (plain text)
    return: message_id หรือ None ถ้าเป็นโหมดพัฒนา
    """
    if not SENDGRID_API_KEY:
        print(f"[DEV EMAIL] to={to_email} subject={subject} content={content}")
        return None

    # ต้อง `pip install sendgrid`
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail

    message = Mail(
        from_email=DEFAULT_FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        plain_text_content=content
    )
    sg = SendGridAPIClient(SENDGRID_API_KEY)
    resp = sg.send(message)
    # ส่งสำเร็จมักได้ 202
    return str(resp.status_code)
