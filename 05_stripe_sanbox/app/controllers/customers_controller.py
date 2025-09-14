from fastapi import APIRouter
from app.schemas.customer import CustomerCreate, CustomerOut
from app.services.customers_service import create_customer

router = APIRouter(prefix="/customers", tags=["customers"])

@router.post("", response_model=CustomerOut)
def create(body: CustomerCreate):
    return create_customer(email=body.email, name=body.name)
