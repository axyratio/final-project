from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.order import Order
from app.models.payment import Payment, PaymentStatus
from app.models.product import ProductVariant
from app.models.store import Store

def get_order(db: Session, order_id):
    return db.query(Order).filter(Order.order_id == order_id).first()

def get_store(db: Session, store_id):
    return db.query(Store).filter(Store.store_id == store_id).first()

def get_payment_by_intent(db: Session, intent_id: str):
    return db.query(Payment).filter(Payment.payment_intent_id == intent_id).first()

def get_payment_by_order(db: Session, order_id):
    return db.query(Payment).filter(Payment.order_id == order_id).first()

def create_payment(db: Session, *, order_id, amount, intent_id: str):
    p = Payment(
        order_id=order_id,
        method_code="STRIPE_CARD",
        amount=amount,
        status=PaymentStatus.PENDING,
        transaction_ref=intent_id,
        payment_intent_id=intent_id,
    )
    db.add(p); db.commit(); db.refresh(p)
    return p

def mark_payment_success(db: Session, intent_id: str):
    p = get_payment_by_intent(db, intent_id)
    if not p: return None
    p.status = PaymentStatus.SUCCESS
    p.paid_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(p)
    return p

def mark_payment_failed(db: Session, intent_id: str):
    p = get_payment_by_intent(db, intent_id)
    if not p: return None
    p.status = PaymentStatus.FAILED
    db.commit(); db.refresh(p)
    return p

def lock_order_paid(db: Session, order: Order, text: str):
    order.is_locked = True
    order.order_status = "PROCESSING"
    order.order_text_status = text
    db.commit(); db.refresh(order)
    return order

def set_order_delivered(db: Session, order: Order, text: str):
    order.order_status = "DELIVERED"
    order.order_text_status = text
    db.commit(); db.refresh(order)
    return order

def set_order_payout_done(db: Session, order: Order, text: str):
    order.order_status = "COMPLETED"
    order.order_text_status = text
    db.commit(); db.refresh(order)
    return order

def reduce_and_lock_variants(db: Session, items: list[dict]):
    total = 0.0
    locked = {}
    for i in items:
        v = db.query(ProductVariant)\
              .with_for_update()\
              .filter(ProductVariant.variant_id == i["variant_id"]).first()
        if not v or v.stock < i["quantity"]:
            raise ValueError("สินค้าไม่พอในสต็อก")
        locked[i["variant_id"]] = v
        total += float(i["price"]) * int(i["quantity"])
    return total, locked
