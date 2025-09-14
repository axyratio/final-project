from fastapi import FastAPI
from app.routes.customers import router as customers
from app.routes.accounts import router as accounts
from app.routes.payments import router as payments

app = FastAPI(title="Stripe Sandbox Demo")

app.include_router(customers)
app.include_router(accounts)
app.include_router(payments)


