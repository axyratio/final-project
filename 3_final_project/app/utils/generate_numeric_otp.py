import random
import string

def generate_numeric_otp(length: int = 6) -> str:
    """
    สร้าง OTP ตัวเลขตามความยาวที่กำหนด (default = 6 หลัก)
    """
    return ''.join(random.choices(string.digits, k=length))