from fastapi import APIRouter, HTTPException
from app.schemas.account import ConnectedAccountCreate, ConnectedAccountOut
from app.schemas.bank import BankAttach
from app.services.accounts_service import create_connected_account
from app.services.bank_service import attach_external_bank

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.post("", response_model=ConnectedAccountOut)
def create_account(body: ConnectedAccountCreate):
    try:
        return create_connected_account(country=body.country, type_=body.type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/attach-bank")
def attach_bank(body: BankAttach):
    try:
        return attach_external_bank(
            account_id=body.account_id,
            country=body.country,
            currency=body.currency,
            routing_number=body.routing_number,
            account_number=body.account_number,
            holder_name=body.account_holder_name
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
