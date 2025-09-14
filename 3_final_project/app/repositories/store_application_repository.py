from sqlalchemy.orm import Session
from app.models.store_application import StoreApplication

def get_store_by_user_id(db: Session, user_id):
    return db.query(StoreApplication).filter(StoreApplication.user_id == user_id).first()

def create_request_store_application(db, store_application):
    # print(f"store_application in repo: {store_application.first_name}")
    # print(f"store_application in repo: {store_application.status}")
    db.add(store_application)
    db.flush()
    return store_application

