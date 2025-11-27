from app.repositories import store_application_repository
from app.models.store_application import StoreApplication
from app.utils.hmac_pid import hmac_pid

import uuid
from app.models.store_application import StoreApplication
from app.repositories import store_application_repository
from app.utils.response_handler import success_response, error_response
from app.utils.hmac_pid import hmac_pid  # สมมติว่าใช้สำหรับเข้ารหัสบัตร

def store_application_service(db, auth_current_user, data, citizen_data):
    try:
        cid = citizen_data.get('citizen_id')
        verified = citizen_data.get('verified', False)

        fullname = f"{data.first_name} {data.last_name}"
        print(f"fullname match: {fullname == data.bank_account_name}")

        # ✅ ตรวจว่ามีรหัสบัตรไหม
        if not cid:
            return error_response(
                "ไม่สามารถสมัครร้านค้าได้",
                {"citizen_id": "ไม่พบรหัสบัตรประชาชนจากระบบตรวจสอบ"},
                status_code=400
            )

        # ✅ ตรวจว่าชื่อกับบัญชีธนาคารตรงกันไหม
        if data.bank_account_name != fullname:
            return error_response(
                "ไม่สามารถสมัครร้านค้าได้",
                {"bank_account_name": "ชื่อจริงกับชื่อบัญชีของธนาคารไม่ตรงกัน"},
                status_code=400
            )

        # ✅ ตรวจว่ามีใบสมัครอยู่แล้วหรือยัง
        existing_store = store_application_repository.get_store_by_hmac_pid(db=db, pid=cid)
        if existing_store:
            if existing_store.status == "APPROVED":
                return error_response(
                    "บัญชีนี้มีร้านค้าอยู่แล้ว",
                    {"status": "APPROVED"},
                    status_code=400
                )
            if existing_store.status == "PENDING":
                return error_response(
                    "ร้านค้ากำลังรอการอนุมัติ",
                    {"status": "PENDING"},
                    status_code=400
                )
            if existing_store.status == "REJECTED":
                db.delete(existing_store)
                db.commit()

        # ✅ ถ้าบัตรผ่านการยืนยัน — สมัครสำเร็จ
        if verified:
            new_store = StoreApplication(
                user_id=auth_current_user.user_id,
                status="APPROVED",
                first_name=data.first_name,
                last_name=data.last_name,
                birth_date=data.birth_date,
                card_is_verified=True,
                hmac_card_id=hmac_pid(cid),
                mask_card_id=cid,
                phone_number=data.phone_number,
                store_address=data.store_address,
                bank_account_name=data.bank_account_name,
                bank_account_number=data.bank_account_number,
                bank_name=data.bank_name,
            )
            db.add(new_store)
            db.commit()
            db.refresh(new_store)

            return success_response(
                "สมัครร้านค้าสำเร็จ (บัตรประชาชนผ่านการยืนยันแล้ว)",
                new_store,
                status_code=201
            )

        # ❌ ถ้าบัตรไม่ผ่านการยืนยัน
        return error_response(
            "การตรวจสอบบัตรประชาชนไม่สำเร็จ",
            {"verification": "กรุณาตรวจสอบข้อมูลอีกครั้ง"},
            status_code=400
        )

    except Exception as e:
        db.rollback()
        return error_response(
            "เกิดข้อผิดพลาดขณะสมัครร้านค้า",
            {"error": str(e)},
            status_code=500
        )

    

# def update_store_application_service(db, auth_current_user, data):
#     try:
#         store_app = store_application_repository.get_store_info(
#             db=db, user_id=auth_current_user.user_id
#         )

#         if not store_app:
#             return None, "ไม่พบบัญชีร้านค้า"

#         if store_app.deleted_at:
#             return None, "ร้านค้านี้ถูกลบแล้ว"

#         # อัปเดตข้อมูล
#         store_app.phone_number = data.phone_number or store_app.phone_number
#         store_app.store_address = data.store_address or store_app.store_address
#         store_app.bank_account_name = data.bank_account_name or store_app.bank_account_name
#         store_app.bank_account_number = data.bank_account_number or store_app.bank_account_number
#         store_app.bank_name = data.bank_name or store_app.bank_name
#         db.commit()
#         db.refresh(store_app)
#         return store_app, "อัปเดตรายละเอียดร้านค้าสำเร็จ"

#     except Exception as e:
#         db.rollback()
#         return None, str(e)

# from app.utils.now_utc import now_utc

# def delete_store_application_service(db, auth_current_user):
#     try:
#         store_app = store_application_repository.get_store_info(
#             db=db, user_id=auth_current_user.user_id
#         )

#         if not store_app:
#             return None, "ไม่พบบัญชีร้านค้า"

#         if store_app.deleted_at:
#             return None, "ร้านค้านี้ถูกลบไปแล้ว"

#         store_app.deleted_at = now_utc()
#         db.commit()
#         return store_app, "ลบร้านค้าสำเร็จ (Soft Delete)"

#     except Exception as e:
#         db.rollback()
#         return None, str(e)


# def db, auth_current_user, data, citizen_data):
#     try:
#         isStore = None
#         new_store = None
#         cid = citizen_data.get('citizen_id')
#         verified = citizen_data.get('verified', False)

#         fullname = f"{data.first_name} {data.last_name}"
#         print(f"fullname in service: {fullname == data.bank_account_name}")

#         # ดึงข้อมูลร้านเดิม (ถ้ามี)
#         isStore = store_application_repository.get_store_by_user_id(db=db, user_id=auth_current_user.user_id)
#         print(f"is store {isStore.first_name if isStore else 'None'}")

#         if not cid:
#             return None, "ไม่พบรหัสบัตรที่กรอก"

#         if data.bank_account_name != fullname:
#             return None, "ชื่อจริงกับชื่อบัญชีของธนาคารไม่ตรงกัน"

#         if isStore and (
#             isStore.first_name == data.first_name and
#             isStore.last_name == data.last_name and
#             isStore.mask_card_id == cid and
#             isStore.birth_date == data.birth_date and 
#             isStore.status == "PENDING"
#         ):
#             return None, "เคยส่งคำขอแล้ว ต้องรออนุมัติ"

#         if isStore and (
#             isStore.first_name == data.first_name and
#             isStore.last_name == data.last_name and
#             isStore.mask_card_id == cid and
#             isStore.birth_date == data.birth_date and 
#             isStore.status == "APPROVED"
#         ):
#             return None, "เลขบัตรประชาชนเคยใช้แล้ว"

#         # ถ้ามีร้านเดิม
#         if isStore:
#             if isStore.status == "PENDING":
#                 return None, "ร้านค้ากําลังรอการอนุมัติ"
#             if isStore.status == "APPROVED":
#                 return None, "ร้านค้าได้รับการอนุมัติแล้ว สามารถมีร้านค้าได้ 1 ร้าน"
#             if isStore.status == "REJECTED":
#                 new_store = StoreApplication(
#                     user_id=auth_current_user.user_id,
#                     status=data.status,
#                     first_name=data.first_name,
#                     last_name=data.last_name,
#                     birth_date=data.birth_date,
#                     card_is_verified=verified,
#                     mask_card_id=cid,
#                     phone_number=data.phone_number,
#                     store_address=data.store_address,
#                     bank_account_name=data.bank_account_name,
#                     bank_account_number=data.bank_account_number,
#                     bank_name=data.bank_name,
#                 )
#                 db.add(new_store)
#                 db.commit()
#                 db.refresh(new_store)
#                 return new_store, "ส่งคำขอในการเปิดร้านใหม่สำเร็จ"

#         # ถ้าไม่มีร้านเดิม → สร้างใหม่
#         new_store = StoreApplication(
#             user_id=auth_current_user.user_id,
#             status=data.status,
#             first_name=data.first_name,
#             last_name=data.last_name,
#             birth_date=data.birth_date,
#             card_is_verified=verified,
#             mask_card_id=cid,
#             phone_number=data.phone_number,
#             store_address=data.store_address,
#             bank_account_name=data.bank_account_name,
#             bank_account_number=data.bank_account_number,
#             bank_name=data.bank_name,
#         )

#         db.add(new_store)
#         db.commit()
#         db.refresh(new_store)
#         return new_store, None

#     except Exception as e:
#         db.rollback()
#         return None, str(e)

# ไม่ต้องทำถ้าหากมีระบบเช็คบัญชีธนาคารแล้ว ตอนนี้ยังไม่มี
# def approved_store_application_service(db, auth_current_user):
#     try:
#         print(f"current user in service: {auth_current_user.user_id}")
#         approved_store = store_application_repository.approved_store_by_user_id(
#             db=db,
#             user_id=auth_current_user.user_id
#         )

#         if not approved_store:
#             return None, "ไม่เจอร้านค้าที่ขออนุมัติ"

#         db.commit()
#         db.refresh(approved_store)

#         return approved_store, None

#     except Exception as e:
#         db.rollback()
#         return None, str(e)