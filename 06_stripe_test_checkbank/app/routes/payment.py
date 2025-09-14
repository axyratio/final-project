from fastapi import APIRouter, HTTPException
from app.schemas.payment import (
    CreatePaymentIntentIn, CreatePaymentIntentOut, RetrievePaymentOut
)
from app.services.payment_service import create_payment_intent, retrieve_payment_intent

router = APIRouter()

@router.post("/create-intent", response_model=CreatePaymentIntentOut)
def create_intent(body: CreatePaymentIntentIn):
    try:
        pi = create_payment_intent(body)
        return {
            "payment_intent_id": pi["id"],
            "client_secret": pi["client_secret"],
            "status": pi["status"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/retrieve/{payment_intent_id}", response_model=RetrievePaymentOut)
def get_intent(payment_intent_id: str):
    try:
        pi = retrieve_payment_intent(payment_intent_id)
        return {
            "payment_intent_id": pi["id"],
            "status": pi["status"],
            "amount": pi["amount"],
            "currency": pi["currency"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
