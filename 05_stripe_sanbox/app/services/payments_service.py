from app.core.stripe_client import get_stripe

def create_test_charge(amount: int, currency="usd", capture=True):
    """
    เติมยอดทดสอบให้ balance โดยสร้างชำระเงินใน test mode
    ใช้ token พิเศษเพื่อข้าม pending (เช่น บัตร 4000000000000077 ผ่านทันทีในตัวอย่าง docs)
    """
    stripe = get_stripe()
    # วิธีที่ตรงกับคู่มือทดสอบ balance/test payouts: สร้าง charge ใน Test mode
    charge = stripe.Charge.create(
        amount=amount,
        currency=currency,
        source="tok_bypassPending",  # หรือสร้างผ่าน PaymentIntent + test card
        description="Sandbox balance top-up"
    )
    return {"id": charge["id"], "status": charge["status"]}
