from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.core.config import STRIPE_API_KEY
from app.routes import payment, transfer, webhook, bank
import stripe
import os

# ตั้งค่า Stripe API Key (ใช้ Test Key จาก Dashboard)
# create def on startup



app = FastAPI()
app.include_router(payment.router, prefix="/api/payments", tags=["payments"])
app.include_router(transfer.router, prefix="/api/transfers", tags=["transfers"])
app.include_router(webhook.router, prefix="/api/webhooks", tags=["stripe-webhooks"])
app.include_router(bank.router, prefix="/api/bank", tags=["stripe-webhooks"])

# Schema สำหรับข้อมูลธนาคาร

