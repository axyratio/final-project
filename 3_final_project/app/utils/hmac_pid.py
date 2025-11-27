import hmac
import hashlib
import os


# ใช้คีย์ลับ (SECRET_KEY) จาก environment variable เพื่อความปลอดภัย
SECRET_KEY = os.getenv("HASH_SECRET_KEY", "default_dev_key")  # แนะนำให้เปลี่ยนตอนใช้งานจริง

def hmac_pid(value: str) -> str:
    """
    ฟังก์ชันสำหรับเข้ารหัสข้อมูลด้วย HMAC-SHA256
    :param value: ข้อความ (เช่น เลขบัตรประชาชน)
    :return: ค่าที่ถูกเข้ารหัสแบบ hex string
    """
    if not isinstance(value, str):
        raise TypeError("ค่าที่จะเข้ารหัสต้องเป็น string เท่านั้น")

    return hmac.new(
        SECRET_KEY.encode(),
        value.encode(),
        hashlib.sha256
    ).hexdigest()
