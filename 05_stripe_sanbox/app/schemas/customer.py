from pydantic import BaseModel, EmailStr

class CustomerCreate(BaseModel):
    email: EmailStr
    name: str

class CustomerOut(BaseModel):
    id: str
    email: EmailStr
    name: str
