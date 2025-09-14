from app.repositories import store_application_repository
from app.models.store_application import StoreApplication

def request_store_application_service(db, auth_current_user, data, citizen_data):
    try:
        # ดึงค่าอย่างปลอดภัย
        isStore = None  # 1) กำหนดค่าเริ่มต้นเสมอ
        new_store = None
        cid = citizen_data.get('citizen_id')
        verified = citizen_data.get('verified', False)

        fullname = data.first_name + ' ' + data.last_name

        print(f"fullname in service: {fullname == data.bank_account_name} ")

        isStore = store_application_repository.get_store_by_user_id(
            db=db, user_id=auth_current_user.user_id
        )

        if not cid:
            return None, "Missing citizen_id from validation response"
        
        if (data.bank_account_name != fullname):
                return None, "ชื่อจริงกับชื่อบัญชีของธนาคารไม่ตรงกัน"
        
        if (isStore.first_name == data.first_name and
                isStore.last_name == data.last_name and
                isStore.mask_card_id == cid and
                isStore.birth_date == data.birth_date and 
                isStore.status == "PENDING"):
                return None, "เคยส่งคำขอแล้ว ต้องรออนุมัติ"
        
        if (isStore.first_name == data.first_name and
                isStore.last_name == data.last_name and
                isStore.mask_card_id == cid and
                isStore.birth_date == data.birth_date and 
                isStore.status == "APPROVED"):
                return None, "เลขบัตรประชาชนเคยใช้แล้ว"

        # หา store ของ user นี้
       

        # มี store เดิมอยู่แล้ว -> เช็คความซ้ำ/สถานะ
        if isStore:
            # ถ้าข้อมูลซ้ำ
            
            
            if isStore.status == "PENDING":
                return None, "ร้านค้ากําลังรอการอนุมัติ"

            if isStore.status == "APPROVED":
                return None, "ร้านค้าได้รับการอนุมัติแล้ว สามารถมีร้านค้าได้ 1 ร้าน"

            if isStore.status == "REJECTED":
                new_store = StoreApplication(
                user_id=auth_current_user.user_id,
                status=data.status,
                first_name=data.first_name,
                last_name=data.last_name,
                birth_date=data.birth_date,
                card_is_verified=verified,
                mask_card_id=cid,
                phone_number=data.phone_number,
                store_address=data.store_address,
                bank_account_name=data.bank_account_name,
                bank_account_number=data.bank_account_number,
                bank_name=data.bank_name,
            )

                db.update(new_store)
                db.commit()
                db.refresh(new_store)
                return new_store, "ส่งคำขอในการเปิดร้านใหม่สำเร็จ"

            

            # ณ จุดนี้ คุณอาจกำหนด policy ว่าถ้ามี record แต่ไม่เข้าเงื่อนไขด้านบน จะไม่สร้างใหม่
            # return None, "Store already exists with different data"

            # หรือปล่อยให้สร้างใหม่ (ขึ้นกับธุรกิจ) — แนะนำอย่าทำให้ซ้ำ

            

        # ไม่มี store เดิม -> สร้างใหม่
        new_store = StoreApplication(
            user_id=auth_current_user.user_id,
            status=data.status,
            first_name=data.first_name,
            last_name=data.last_name,
            birth_date=data.birth_date,
            card_is_verified=verified,
            mask_card_id=cid,
            phone_number=data.phone_number,
            store_address=data.store_address,
            bank_account_name=data.bank_account_name,
            bank_account_number=data.bank_account_number,
            bank_name=data.bank_name,
        )

        db.add(new_store)
        db.commit()
        db.refresh(new_store)  # ให้แน่ใจว่าค่า PK/เวลา ถูกดึงกลับ
        return new_store, None

    except Exception as e:
        db.rollback()
        return None, str(e)

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