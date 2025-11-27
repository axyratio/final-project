from sqlalchemy.orm import Session
from app.models.store import Store
from sqlalchemy import and_
from app.utils.now_utc import now_utc

def create_store(db: Session, store: Store):
    db.add(store)
    db.commit()
    db.refresh(store)
    return store

def get_store_by_user(db: Session, user_id):
    return db.query(Store).filter(
        and_(Store.user_id == user_id )
    ).first()

def get_store_by_id(db: Session, store_id):
    return db.query(Store).filter(
        and_(Store.store_id == store_id )
    ).first()

def get_all_stores(db: Session):
    return db.query(Store).filter().all()

def update_store(db: Session, store: Store):
    db.commit()
    db.refresh(store)
    return store

def soft_delete_store(db: Session, store: Store):
    store.deleted_at = now_utc()
    db.commit()
    return store
