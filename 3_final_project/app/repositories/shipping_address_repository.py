from sqlalchemy.orm import Session
from app.models.shipping_address import ShippingAddress

def create_shipping_address_repo(db: Session, user_id: str, data):
    try:
        new_addr = ShippingAddress(user_id=user_id, **data.dict())
        db.add(new_addr)
        db.commit()
        db.refresh(new_addr)
        return new_addr
    except Exception as e:
        db.rollback()
        raise e

def get_shipping_address_by_id_repo(db: Session, ship_addr_id: str):
    try:
        return db.query(ShippingAddress).filter(ShippingAddress.ship_addr_id == ship_addr_id).first()
    except Exception as e:
        raise e

def get_all_shipping_addresses_repo(db: Session, user_id: str):
    try:
        return db.query(ShippingAddress).filter(ShippingAddress.user_id == user_id).all()
    except Exception as e:
        raise e

def update_shipping_address_repo(db: Session, ship_addr_id: str, data):
    try:
        addr = db.query(ShippingAddress).filter(ShippingAddress.ship_addr_id == ship_addr_id).first()
        if not addr:
            return None
        for key, value in data.dict().items():
            setattr(addr, key, value)
        db.commit()
        db.refresh(addr)
        return addr
    except Exception as e:
        db.rollback()
        raise e

def delete_shipping_address_repo(db: Session, ship_addr_id: str):
    try:
        addr = db.query(ShippingAddress).filter(ShippingAddress.ship_addr_id == ship_addr_id).first()
        if not addr:
            return None
        db.delete(addr)
        db.commit()
        return addr
    except Exception as e:
        db.rollback()
        raise e
