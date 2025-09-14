from pydantic import BaseModel

class ConnectedAccountCreate(BaseModel):
    country: str = "US"
    type: str = "express"  # หรือ "custom"

class ConnectedAccountOut(BaseModel):
    id: str
    charges_enabled: bool
    payouts_enabled: bool
