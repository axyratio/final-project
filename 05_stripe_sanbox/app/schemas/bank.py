from pydantic import BaseModel, constr

class BankAttach(BaseModel):
    account_id: str     # connected account id (acct_...)
    country: str = "US"
    currency: str = "usd"
    # เลขทดสอบ Stripe (ตัวอย่าง US): account_number=000123456789, routing_number=110000000
    routing_number: constr(strip_whitespace=True)
    account_number: constr(strip_whitespace=True)
    account_holder_name: str
