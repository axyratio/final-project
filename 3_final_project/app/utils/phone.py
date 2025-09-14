import re

def to_e164_th(phone: str) -> str:
    # แปลงเบอร์ไทยเป็น E.164 แบบง่าย
    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        return ""
    if digits.startswith("0"):       # 0812345678 -> +66812345678
        return "+66" + digits[1:]
    if digits.startswith("66"):      # 66812345678 -> +66812345678
        return "+" + digits
    if phone.startswith("+"):        # +66812345678
        return phone
    # กรณีอื่นถือว่าเป็นไทย
    return "+66" + digits