from pydantic import BaseModel, Field
from typing import Optional
import uuid

class ShippingAddressBase(BaseModel):
    full_name: str
    phone_number: str
    address_line: str
    province: str
    district: str
    sub_district: str
    postal_code: str

class ShippingAddressCreate(ShippingAddressBase):
    pass

class ShippingAddressUpdate(ShippingAddressBase):
    pass

class ShippingAddressResponse(ShippingAddressBase):
    ship_addr_id: uuid.UUID
    user_id: uuid.UUID

    class Config:
        orm_mode = True
