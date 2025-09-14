from pydantic import BaseModel, Field

class CreateTransferIn(BaseModel):
    amount: int = Field(..., description="หน่วยย่อย เช่น 25000 = 250.00 THB")
    currency: str = "thb"
    destination_account: str = Field(..., description="acct_xxx ของผู้ขาย")
    description: str | None = "Transfer to seller"
