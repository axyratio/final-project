from app.core.stripe_client import get_stripe

def attach_external_bank(account_id: str, country: str, currency: str,
                         routing_number: str, account_number: str, holder_name: str):
    stripe = get_stripe()
    # ผูกบัญชีธนาคารทดสอบเข้ากับ connected account
    bank = stripe.Account.create_external_account(
        account_id,
        external_account={
            "object": "bank_account",
            "country": country,
            "currency": currency,
            "routing_number": routing_number,    # ใช้เลขทดสอบตาม docs
            "account_number": account_number,    # ใช้เลขทดสอบตาม docs
            "account_holder_name": holder_name
        }
    )
    # หมายเหตุ: Test mode ต้องใช้เลขบัญชีทดสอบเท่านั้น
    return {"id": bank["id"], "last4": bank["last4"], "bank_name": bank.get("bank_name")}
