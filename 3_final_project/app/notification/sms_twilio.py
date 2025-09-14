import os
from typing import Optional

TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_TOKEN = os.getenv("TWILIO_TOKEN")
TWILIO_FROM = os.getenv("TWILIO_FROM")

def send_sms_twilio(to_e164: str, message: str) -> Optional[str]:
    """
    ส่ง SMS ผ่าน Twilio
    return: message_sid (string) หรือ None ถ้าส่งแบบ mock
    """
    if not (TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM):
        # โหมดพัฒนา: พิมพ์ลงคอนโซลแทนการส่งจริง
        print(f"[DEV SMS] to={to_e164} msg={message}")
        return None

    from twilio.rest import Client  # ต้อง `pip install twilio`
    client = Client(TWILIO_SID, TWILIO_TOKEN)
    msg = client.messages.create(to=to_e164, from_=TWILIO_FROM, body=message)
    return msg.sid
