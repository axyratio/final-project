from app.core.stripe_client import get_stripe

def create_connected_account(country: str = "US", type_: str = "express"):
    stripe = get_stripe()
    acct = stripe.Account.create(type=type_, country=country)
    # สำหรับ Express ให้สร้าง onboarding link ถ้าจะพาไปกรอกข้อมูล
    return {
        "id": acct["id"],
        "charges_enabled": acct["charges_enabled"],
        "payouts_enabled": acct["payouts_enabled"],
    }
