import os
import uuid
from sqlalchemy.orm import Session
from fastapi import UploadFile
import stripe
from app.models import Store, Product, OrderItem
from app.models.role import Role
from app.models.user import User
from app.repositories import store_application_repository, store_repository, user_repository
from app.utils.file_util import save_file, update_file, delete_file, rollback_and_cleanup
from app.utils.response_handler import success_response, error_response

UPLOAD_DIR = "app/uploads/store/logo"
base_url = os.getenv("BASE_URL", "http://localhost:8000")


def create_store_and_connect_stripe(
    db: Session,
    user_id: str,
    name: str,
    description: str,
    address: str,
    logo: UploadFile | None = None,
):
    try:
        # ไม่ต้อง os.makedirs ตรงนี้แล้ว ให้ file_util จัดการเอง (เฉพาะ DISK mode)

        existing_store = db.query(Store).filter(Store.user_id == user_id).first()
        if existing_store:
            return error_response("User already has a store", status_code=400)

        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return error_response("User not found", status_code=404)

        # ✅ สร้าง Stripe Connected Account
        account = stripe.Account.create(
            type="express",
            country="SG",
            email=user.email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
        )

        # ✅ จัดการไฟล์โลโก้ผ่าน save_file (DISK/CLOUD เลือกตาม env)
        logo_path = None
        if logo:
            filename = f"{user_id}_{uuid.uuid4().hex}"
            logo_path = save_file(UPLOAD_DIR, logo, filename)

        # ✅ บันทึกข้อมูลร้าน
        store = Store(
            user_id=user_id,
            name=name,
            description=description,
            address=address,
            logo_path=logo_path,
            is_active=True,
            stripe_account_id=account.id,
        )

        user.role_id = 2

        db.add(store)
        db.commit()
        db.refresh(store)

        onboarding_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{base_url}/store/connect/refresh/{store.store_id}",
            return_url=f"{base_url}/store/connect/success/{store.store_id}",
            type="account_onboarding",
        )

        return success_response(
            "Store created and Stripe connected",
            {
                "store_id": str(store.store_id),
                "stripe_account_id": account.id,
                "onboarding_link": onboarding_link.url,
                "logo_path": logo_path,
                "user_role": user.role.role_name,
            },
        )

    except Exception as e:
        db.rollback()
        return error_response(
            "Failed to create store with Stripe connect", {"error": str(e)}
        )

# ✅ สร้างร้านค้า
def create_store_service(db: Session, auth_current_user, data: dict, logo: UploadFile = None):
    logo_path = None
    try:
        # ✅ ตรวจสอบว่า user มีใบสมัครเปิดร้านหรือยัง
        application = store_application_repository.get_application_by_user(db, auth_current_user.user_id)
        if not application:
            return error_response(
                "ไม่สามารถสร้างร้านค้าได้",
                {"application": "คุณยังไม่ได้ส่งคำขอเปิดร้าน"},
                status_code=403
            )

        # ✅ ตรวจสอบสถานะและการยืนยันบัตร
        if not application.card_is_verified:
            return error_response(
                "ไม่สามารถสร้างร้านค้าได้",
                {"verification": "บัญชียังไม่ผ่านการยืนยันบัตรประชาชน"},
                status_code=403
            )

        if application.status != "APPROVED":
            return error_response(
                "ไม่สามารถสร้างร้านค้าได้",
                {"status": "ใบสมัครยังไม่ได้รับการอนุมัติ"},
                status_code=403
            )
        
        existing = store_repository.get_store_by_user(db, auth_current_user.user_id)
        if existing:
            return error_response("ผู้ใช้นี้มีร้านค้าอยู่แล้ว", {"store": "ร้านค้านี้มีอยู่แล้ว"}, status_code=400)

        if logo:
            filename = f"{uuid.uuid4()}_{logo.filename}"
            logo_path = save_file(UPLOAD_DIR, logo, filename)

        new_store = Store(
            user_id=auth_current_user.user_id,
            name=data["name"],
            description=data.get("description"),
            address=data.get("address"),
            logo_path=logo_path
        )

        db.add(new_store)
        db.commit()
        db.refresh(new_store)
        return success_response("สร้างร้านค้าสำเร็จ", new_store, status_code=201)

    except Exception as e:
        rollback_and_cleanup(db, logo_path)
        return error_response("เกิดข้อผิดพลาดขณะสร้างร้านค้า", {"error": str(e)}, status_code=500)


# ✅ ดึงร้านของผู้ใช้
def get_my_store_service(db: Session, auth_current_user):
    store = store_repository.get_store_by_user(db, auth_current_user.user_id)
    if not store:
        return error_response("ไม่พบร้านค้าของคุณ", {"store": "ไม่พบข้อมูลร้านค้า"}, status_code=404)
    return success_response("ดึงข้อมูลร้านค้าสำเร็จ", store)


# ✅ อัปเดตร้านค้า
def update_store_service(db: Session, auth_current_user, data: dict, logo: UploadFile = None):
    store = store_repository.get_store_by_user(db, auth_current_user.user_id)
    if not store:
        return error_response("ไม่พบร้านค้าของคุณ", {"store": "ไม่พบข้อมูลร้านค้า"}, status_code=404)

    try:
        if logo:
            filename = f"{uuid.uuid4()}_{logo.filename}"
            new_logo_path = update_file(store.logo_path, UPLOAD_DIR, logo, filename)
            store.logo_path = new_logo_path

        if data.get("name"): store.name = data["name"]
        if data.get("description"): store.description = data["description"]
        if data.get("address"): store.address = data["address"]

        db.commit()
        db.refresh(store)
        return success_response("อัปเดตร้านค้าสำเร็จ", store)

    except Exception as e:
        db.rollback()
        return error_response("อัปเดตร้านค้าไม่สำเร็จ", {"error": str(e)}, status_code=500)


# ✅ ลบร้านค้า
def delete_store_service(db: Session, auth_current_user):
    store = store_repository.get_store_by_user(db, auth_current_user.user_id)
    if not store:
        return error_response("ไม่พบร้านค้าของคุณ", {"store": "ไม่พบข้อมูลร้านค้า"}, status_code=404)
    
    user = user_repository.get_user_by_user_id(db, auth_current_user.user_id)
    if (not user):
        return error_response("ไม่เจอชื่อผู้ใช้งาน", {"user": "ไม่เจอชื่อผู้ใช้งาน"}, status_code=404)
        
    user.role_id = 1

    try:
        order_items = (
            db.query(OrderItem)
            .join(Product, OrderItem.product_id == Product.product_id) #ต้องเช็คสถานะด้วยว่า Complete หรือยัง ถ้าหากมีพวก pending แล้วแจ้งไปว่าปฏิเสธโดยร้านค้า และในตะกร้า ให้ไปลบมันออกเลย แล้วก็ลบใน connect ด้วย
            .filter(Product.store_id == store.store_id)
            .all()
        )

        if order_items:
            store.is_open = False
            db.commit()
            return error_response("ร้านนี้มีคำสั่งซื้ออยู่ จึงปิดร้านแทนการลบ",
                                  {"store": "ร้านถูกตั้งสถานะปิด"}, status_code=400)

        delete_file(store.logo_path)
        db.delete(store)
        db.commit()
        return success_response("ลบร้านค้าสำเร็จ")

    except Exception as e:
        db.rollback()
        return error_response("เกิดข้อผิดพลาดขณะลบร้านค้า", {"error": str(e)}, status_code=500)


# ------------------------------------------

def create_stripe_onboarding_link(db, user_id: str):
    """
    ใช้เมื่อร้านมี Stripe account อยู่แล้ว แต่ยังไม่ได้กรอก onboarding (KYC)
    ระบบจะสร้างลิงก์ onboarding ใหม่ให้ร้านกรอกข้อมูลอีกครั้ง
    """
    try:
        store = db.query(Store).filter(Store.user_id == user_id).first()
        if not store:
            return error_response("Store not found", status_code=404)

        if not store.stripe_account_id:
            return error_response("This store has no Stripe account ID yet", status_code=400)

        # ✅ สร้างลิงก์ onboarding ใหม่จาก Stripe account เดิม
        onboarding_link = stripe.AccountLink.create(
            account=store.stripe_account_id,
            refresh_url=f"{base_url}/store/connect/refresh/{store.store_id}",
            return_url=f"{base_url}/store/connect/success/{store.store_id}",
            type="account_onboarding",
        )

        return success_response("New Stripe onboarding link created", {
            "store_id": str(store.store_id),
            "stripe_account_id": store.stripe_account_id,
            "onboarding_link": onboarding_link.url
        })

    except Exception as e:
        return error_response("Failed to create onboarding link", {"error": str(e)})