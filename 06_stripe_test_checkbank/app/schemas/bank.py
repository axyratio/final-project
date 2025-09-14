from pydantic import BaseModel

class BankAccountCheck(BaseModel):
    account_number: str
    routing_number: str
    account_holder_name: str
    account_holder_type: str = "individual"  # หรือ "company"
    country: str = "US"
    currency: str = "usd"