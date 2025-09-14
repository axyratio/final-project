from app.core.stripe_client import get_stripe

def create_customer(email: str, name: str):
    stripe = get_stripe()
    c = stripe.Customer.create(email=email, name=name)
    return {"id": c["id"], "email": c["email"], "name": c.get("name")}
