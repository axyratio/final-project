from sqlalchemy.orm import Session
# from app.models.store_application import StoreApplication
from app.utils.hmac_pid import hmac_pid

# def get_application_by_user(db: Session, user_id):
#     return (
#         db.query(StoreApplication)
#         .filter(StoreApplication.user_id == user_id)
#         .first()
#     )

# ✅ ตรวจสอบว่าผ่านการยืนยันบัตรแล้วหรือไม่
# def is_card_verified(db: Session, user_id) -> bool:
#     app = get_application_by_user(db, user_id)
#     return bool(app and app.card_is_verified)

# # ✅ ตรวจสอบว่าสถานะใบสมัครถูกอนุมัติหรือยัง
# def is_application_approved(db: Session, user_id) -> bool:
#     app = get_application_by_user(db, user_id)
#     return bool(app and app.status == "APPROVED")

# def get_store_by_hmac_pid(db: Session, pid: str):
#     """
#     ค้นหาร้านค้าด้วยเลขบัตร (แบบเข้ารหัส HMAC)
#     โดยไม่ต้องเก็บเลขบัตรจริงในฐานข้อมูล
#     """
#     pid_hash = hmac_pid(pid)
#     return db.query(StoreApplication).filter(StoreApplication.hmac_card_id == pid_hash).first()

# def create_request_store_application(db, store_application):
#     # print(f"store_application in repo: {store_application.first_name}")
#     # print(f"store_application in repo: {store_application.status}")
#     db.add(store_application)
#     db.flush()
#     return store_application

# def get_store_info(db: Session, user_id: str):
#     return db.query(StoreApplication).filter(StoreApplication.user_id == user_id).first()

