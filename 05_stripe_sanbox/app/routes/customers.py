from fastapi import APIRouter, HTTPException
from app.schemas.customer import CustomerCreate, CustomerOut
from app.services.customers_service import create_customer

router = APIRouter(prefix="/customers", tags=["customers"])

@router.post("", response_model=CustomerOut)
def create(body: CustomerCreate):
    try:
        return create_customer(email=body.email, name=body.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
