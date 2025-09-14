import stripe
from app.core.config import STRIPE_API_KEY

stripe.api_key = STRIPE_API_KEY

def create_transfer(payload):
    # โอนจาก balance ของแพลตฟอร์ม -> balance ของผู้ขาย (Connected Account)
    transfer = stripe.Transfer.create(
        amount=payload.amount,
        currency=payload.currency,
        destination=payload.destination_account,
        description=payload.description
    )
    return transfer
