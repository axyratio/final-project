from typing import Optional
from app.utils.phone import to_e164_th
from app.notification.sms_twilio import send_sms_twilio
# from app.notification.email_sendgrid import send_email_sendgrid
from app.core.config import settings

# ตั้งค่าใน .env / settings:
# OTP_CHANNEL = "sms" | "email" | "both"
# ซัพพอร์ต user.phone_number และ user.email

def send_register_otp_notification(user, otp_code: str) -> dict:
    """
    ส่ง OTP สำหรับ purpose=register ตามช่องทางที่ตั้งค่าไว้
    return: {"sms_sid": ..., "email_status": ...}
    """
    results = {}
    channel = getattr(settings, "OTP_CHANNEL", "sms").lower()

    if channel in ("sms", "both"):
        phone = getattr(user, "phone_number", None)
        if phone:
            e164 = to_e164_th(phone)
            msg = f"รหัสยืนยันของคุณคือ {otp_code} ใช้ได้ {settings.OTP_TOKEN_EXPIRE_MINUTES} นาที"
            try:
                sid = send_sms_twilio(e164, msg)
                results["sms_sid"] = sid or "dev"
            except Exception as e:
                results["sms_error"] = str(e)

    # if channel in ("email", "both"):
    #     email = getattr(user, "email", None)
    #     if email:
    #         subject = "รหัสยืนยันการสมัครสมาชิก"
    #         content = f"รหัส OTP ของคุณคือ {otp_code}\nจะหมดอายุภายใน {settings.OTP_TOKEN_EXPIRE_MINUTES} นาที"
    #         try:
    #             status = send_email_sendgrid(email, subject, content)
    #             results["email_status"] = status or "dev"
    #         except Exception as e:
    #             results["email_error"] = str(e)

    return results
