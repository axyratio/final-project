# # app/services/user_tryon_image_service.py - Enhanced with Image Processing
# from sqlalchemy.orm import Session
# from app.repositories.user_tryon_image_repository import (
#     create_user_image,
#     get_all_user_images,
#     get_user_image_by_id,
#     update_user_image,
#     delete_user_image,
# )
# from app.utils.response_handler import success_response, error_response
# from app.utils.file_util import save_file_with_processing, delete_file
# import uuid

# UPLOAD_DIR = "app/static/user_tryon"

# def _to_dict(data):
#     if hasattr(data, "dict"):
#         return data.dict(exclude_unset=True)
#     elif isinstance(data, dict):
#         return data
#     else:
#         return {}


# # ───────────────────────────────
# # ✨ CREATE with Image Processing
# # ───────────────────────────────
# def service_create_user_image(
#     db: Session,
#     data,
#     image_file=None,
#     process_image: bool = True  # ✅ เปิด background removal by default
# ):
#     """
#     สร้างรูปโมเดลผู้ใช้
    
#     Parameters:
#     -----------
#     db : Session
#         Database session
    
#     data : dict | Pydantic model
#         ข้อมูลรูปภาพ (user_id, name, etc.)
    
#     image_file : UploadFile
#         ไฟล์รูปภาพ
    
#     process_image : bool
#         True = ลบพื้นหลัง + standardize (default)
#         False = บันทึกตามปกติ
#     """
#     try:
#         data_dict = _to_dict(data)
        
#         if image_file:
#             ext = image_file.filename.split(".")[-1]
#             # ✅ เปลี่ยนเป็น .png ถ้าประมวลผล เพราะ output เป็น PNG
#             if process_image:
#                 ext = "png"
            
#             filename = f"{uuid.uuid4().hex}.{ext}"
            
#             # ✅ ใช้ save_file_with_processing แทน save_file
#             path = save_file_with_processing(
#                 UPLOAD_DIR,
#                 image_file,
#                 filename,
#                 process_image=process_image,
#                 max_size=1024,
#                 padding=50  # ✅ model ใช้ padding 50px
#             )
            
#             data_dict["image_url"] = path
#             print(f"✅ Saved model image: {path}")

#         image = create_user_image(db, data_dict)
#         return success_response("Created user try-on image successfully", image)
    
#     except Exception as e:
#         db.rollback()
#         print(f"❌ Error creating user try-on image: {e}")
#         import traceback
#         traceback.print_exc()
#         return error_response("Failed to create user try-on image", {"error": str(e)})


# # ───────────────────────────────
# # READ ALL
# # ───────────────────────────────
# def service_get_all_user_images(db: Session):
#     try:
#         images = get_all_user_images(db)
#         return success_response("Fetched all user try-on images", images)
#     except Exception as e:
#         return error_response("Failed to fetch images", {"error": str(e)})


# # ───────────────────────────────
# # READ BY ID
# # ───────────────────────────────
# def service_get_user_image_by_id(db: Session, user_image_id):
#     try:
#         image = get_user_image_by_id(db, user_image_id)
#         if not image:
#             return error_response("User try-on image not found", status_code=404)
#         return success_response("Fetched user try-on image", image)
#     except Exception as e:
#         return error_response("Failed to fetch user try-on image", {"error": str(e)})


# # ───────────────────────────────
# # ✨ UPDATE with Image Processing
# # ───────────────────────────────
# def service_update_user_image(
#     db: Session,
#     user_image_id,
#     data,
#     image_file=None,
#     process_image: bool = True  # ✅ เปิด background removal by default
# ):
#     """อัปเดตรูปโมเดลผู้ใช้"""
#     try:
#         data_dict = _to_dict(data)
#         image = get_user_image_by_id(db, user_image_id)
#         if not image:
#             return error_response("User try-on image not found", status_code=404)

#         if image_file:
#             # ลบรูปเก่า
#             if image.image_url:
#                 delete_file(image.image_url)
            
#             ext = image_file.filename.split(".")[-1]
#             if process_image:
#                 ext = "png"
            
#             filename = f"{uuid.uuid4().hex}.{ext}"
            
#             # ✅ ใช้ save_file_with_processing
#             path = save_file_with_processing(
#                 UPLOAD_DIR,
#                 image_file,
#                 filename,
#                 process_image=process_image,
#                 max_size=1024,
#                 padding=50
#             )
            
#             data_dict["image_url"] = path
#             print(f"✅ Updated model image: {path}")

#         updated = update_user_image(db, user_image_id, data_dict)
#         return success_response("Updated user try-on image successfully", updated)
    
#     except Exception as e:
#         db.rollback()
#         print(f"❌ Error updating user try-on image: {e}")
#         import traceback
#         traceback.print_exc()
#         return error_response("Failed to update user try-on image", {"error": str(e)})


# # ───────────────────────────────
# # DELETE
# # ───────────────────────────────
# def service_delete_user_image(db: Session, user_image_id):
#     try:
#         image = get_user_image_by_id(db, user_image_id)
#         if not image:
#             return error_response("User try-on image not found", status_code=404)

#         if image.image_url:
#             delete_file(image.image_url)

#         delete_user_image(db, user_image_id)
#         return success_response(
#             "Deleted user try-on image successfully",
#             {"user_image_id": user_image_id}
#         )
#     except Exception as e:
#         db.rollback()
#         return error_response("Failed to delete user try-on image", {"error": str(e)})