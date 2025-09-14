from pydantic import BaseModel, Field
from typing import List, Optional

class CreatePaymentIntentIn(BaseModel):
    amount: int = Field(..., description="หน่วยย่อย (THB = สตางค์) เช่น 19900 = 199.00 THB")
    currency: str = "thb"
    description: Optional[str] = "Order description"
    order_id: Optional[str] = None
    customer_email: Optional[str] = None
    payment_method_types: List[str] = ["promptpay", "card"]  # เลือกได้ตามต้องการ

class CreatePaymentIntentOut(BaseModel):
    payment_intent_id: str
    client_secret: str
    status: str

class RetrievePaymentOut(BaseModel):
    payment_intent_id: str
    status: str
    amount: int
    currency: str
