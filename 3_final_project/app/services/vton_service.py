# app/services/vton_service.py
"""
Service สำหรับจัดการระบบ Virtual Try-On (VTON)
รวมการเรียก IDM VTON API
"""
import io
import os
import uuid
import requests
import base64
from typing import Optional
from uuid import UUID
from io import BytesIO
from PIL import Image
# from rembg import remove

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.product import UserTryOnImage, VTONSession, ProductVariant, ProductImage
from app.models.vton_background import VTONBackground
from app.models.garment_image import GarmentImage
from app.models.garment_image import user_product_garments
from app.utils.file_util import save_file, delete_file, rollback_and_cleanup
from app.utils.now_utc import now_utc
from app.utils.response_handler import success_response, error_response


class VTONService:
    """Service สำหรับจัดการ Virtual Try-On"""

    # ==================== IMAGE PROCESSING (REMBG) ====================

    # @staticmethod
    # def _process_image_rembg(
    #     file_bytes: bytes,
    #     max_size: int = 1024,
    #     padding: int = 30
    # ) -> bytes:
    #     """
    #     ลบพื้นหลัง, crop, resize, จัดกึ่งกลาง และเพิ่ม padding
    #     คืนค่า bytes ของ PNG ที่พร้อมบันทึก
    #     """
    #     # 1. ลบพื้นหลังด้วย rembg
    #     removed = remove(file_bytes)
    #     img = Image.open(BytesIO(removed)).convert("RGBA")

    #     # 2. crop เฉพาะส่วนวัตถุ
    #     bbox = img.getbbox()
    #     if not bbox:
    #         # ถ้าไม่พบวัตถุ คืนค่ารูปเดิมในรูปแบบ PNG
    #         buf = BytesIO()
    #         img.save(buf, "PNG")
    #         return buf.getvalue()

    #     cropped = img.crop(bbox)

    #     # 3. resize ให้ด้านที่ยาวที่สุดไม่เกิน (max_size - padding*2)
    #     inner_max = max_size - (padding * 2)
    #     cropped.thumbnail((inner_max, inner_max), Image.Resampling.LANCZOS)

    #     # 4. สร้าง canvas ใหม่พร้อม padding และจัดวัตถุกึ่งกลาง
    #     canvas_w = cropped.width + (padding * 2)
    #     canvas_h = cropped.height + (padding * 2)
    #     final = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    #     final.paste(cropped, (padding, padding), cropped)

    #     # 5. คืนค่าเป็น bytes (PNG)
    #     buf = BytesIO()
    #     final.save(buf, "PNG")
    #     return buf.getvalue()

    # ==================== IDM VTON API ====================
    
    @staticmethod
    def _get_idm_api_config():
        """ดึงค่า config สำหรับ IDM API"""
        return {
            "url": os.getenv("IDM_VTON_URL", "https://api.segmind.com/v1/idm-vton"),
            "api_key": os.getenv("IDM_VTON_API_KEY", ""),
            "timeout": int(os.getenv("IDM_VTON_TIMEOUT", "380"))
        }
    
    @staticmethod
    def _image_to_base64(image_path: str) -> str:
        """แปลงไฟล์รูปภาพเป็น base64 string"""
        try:
            with open(image_path, 'rb') as img_file:
                return base64.b64encode(img_file.read()).decode('utf-8')
        except Exception as e:
            print(f"❌ Error converting image to base64: {e}")
            return ""
    
    @staticmethod
    def _image_url_to_base64(image_url: str) -> str:
        """แปลง URL หรือ path ของรูปเป็น data URL base64"""
        try:
            # ถ้าเป็น local path
            if os.path.exists(image_url):
                with open(image_url, 'rb') as f:
                    img_data = f.read()
                    return f"data:image/jpeg;base64,{base64.b64encode(img_data).decode()}"
            
            # ถ้าเป็น URL ให้ดาวน์โหลด
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            img_data = response.content
            return f"data:image/jpeg;base64,{base64.b64encode(img_data).decode()}"
        except Exception as e:
            print(f"❌ Error converting URL to base64: {e}")
            return image_url  # fallback ใช้ URL เดิม
    
    @staticmethod
    def _call_idm_vton_api(
        human_img_url: str,
        garment_img_url: str,
        garment_description: str = "",
        category: str = "upper_body",
        steps: int = 30,
        seed: int = 42
    ) -> dict:
        """
        เรียก IDM VTON API
        
        Parameters:
        - human_img_url: URL หรือ path ของรูปโมเดล
        - garment_img_url: URL หรือ path ของรูปเสื้อผ้า
        - garment_description: คำอธิบายเสื้อผ้า
        - category: ประเภทเสื้อผ้า (upper_body, lower_body, dresses)
        - steps: จำนวน steps ในการ generate (20-50)
        - seed: random seed
        
        Returns:
        - dict: {"success": bool, "image_url": str, "error": str}
        """
        config = VTONService._get_idm_api_config()
        print(f"[IDM] VTON API Config: {config}")
        
        if not config["api_key"]:
            return {
                "success": False,
                "image_url": None,
                "error": "IDM_VTON_API_KEY not configured"
            }
        
        try:
            # เตรียม headers
            headers = {
                "x-api-key": config["api_key"],
                "Content-Type": "application/json"
            }
            
            # แปลงรูปภาพเป็น base64 data URL
            # human_img_data = VTONService._image_url_to_base64(human_img_url)
            # garment_img_data = VTONService._image_url_to_base64(garment_img_url)
            
            # เตรียม payload
            payload = {
                "crop": False,
                "seed": seed,
                "steps": steps,
                "category": category,
                "force_dc": False,
                "human_img": human_img_url,
                "garm_img": garment_img_url,
                "mask_only": False,
                "garment_des": garment_description
            }
            
            # เรียก API
            print(f"🔄 Calling IDM VTON API...")
            print(f"[IDM] Payload keys: {payload}")
            
            response = requests.post(
                config["url"],
                headers=headers,
                json=payload,
                timeout=config["timeout"]
            )
            
            print("[IDM] status:", response.status_code)
            
            if response.status_code == 200:
                ct = (response.headers.get("Content-Type") or "").lower()
                print("[IDM] content-type:", ct)

                if ct.startswith("image/"):
                    result_filename = f"vton_result_{uuid.uuid4().hex}.jpg"
                    result_dir = "app/uploads/vton/results"

                    # 1. แปลง bytes จาก response เป็น File-like object (BytesIO)
                    content_io = io.BytesIO(response.content)

                    # 2. จำลอง UploadFile object เพื่อให้ใช้กับฟังก์ชัน save_file ได้
                    # เพราะ save_file ของคุณมีการเรียกใช้ file.file ข้างใน
                    fake_upload_file = UploadFile(
                        file=content_io, 
                        filename=result_filename
                    )

                    # 3. เรียกใช้ save_file ที่คุณเขียนไว้ 
                    # (มันจะจัดการเช็คเองว่าต้องลง Disk หรือ Cloudinary ตาม ENV)
                    final_url_or_path = save_file(result_dir, fake_upload_file, result_filename)

                    print(f"✅ IDM VTON API success - saved to {final_url_or_path}")
                    
                    return {
                        "success": True,
                        "image_url": final_url_or_path,
                        "error": None
                    }
                
                # กรณีเป็น JSON
                try:
                    result = response.json()
                except Exception as e:
                    error_msg = f"IDM API exception: response is not JSON ({str(e)})"
                    print(f"❌ {error_msg}")
                    return {
                        "success": False,
                        "image_url": None,
                        "error": error_msg
                    }
                
                print(f"[IDM] VTON API Response: {result}")
                
                # IDM API ส่งผลลัพธ์เป็น base64 image
                if isinstance(result, dict) and "image" in result and result["image"]:
                    # บันทึกรูปผลลัพธ์
                    result_image_data = base64.b64decode(result["image"])
                    
                    # สร้าง unique filename
                    result_filename = f"vton_result_{uuid.uuid4().hex}.jpg"
                    result_dir = "app/uploads/vton/results"
                    os.makedirs(result_dir, exist_ok=True)
                    result_path = os.path.join(result_dir, result_filename)
                    
                    # บันทึกไฟล์
                    with open(result_path, 'wb') as f:
                        f.write(result_image_data)
                    
                    print(f"✅ IDM VTON API success - saved to {result_path}")
                    
                    return {
                        "success": True,
                        "image_url": result_path,
                        "error": None
                    }
                else:
                    return {
                        "success": False,
                        "image_url": None,
                        "error": "No image in API response"
                    }
            else:
                error_msg = f"IDM API error: {response.status_code} - {response.text}"
                print(f"❌ {error_msg}")
                return {
                    "success": False,
                    "image_url": None,
                    "error": error_msg
                }
                
        except Exception as e:
            error_msg = f"IDM API exception: {str(e)}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "image_url": None,
                "error": error_msg
            }


    # ==================== USER TRYON IMAGES ====================

    @staticmethod
    async def upload_user_tryon_image(
        db: Session,
        user: User,
        file: UploadFile
    ):
        """อัปโหลดรูปโมเดลของผู้ใช้ (บันทึกรูปต้นฉบับ ไม่ลบพื้นหลัง)"""
        saved_path = None
        try:
            if not file.content_type or not file.content_type.startswith("image/"):
                return error_response("รองรับเฉพาะไฟล์รูปภาพเท่านั้น", {}, 400)

            content = await file.read()
            if len(content) > 5 * 1024 * 1024:  # 5MB
                return error_response("ขนาดไฟล์ต้องไม่เกิน 5MB", {}, 413)

            file.file.seek(0)

            upload_dir = "app/uploads/vton/user_images"
            ext = os.path.splitext(file.filename or "")[1] or ".jpg"
            unique_name = f"{uuid.uuid4().hex}{ext}"

            saved_path = save_file(upload_dir, file, unique_name)

            new_image = UserTryOnImage(
                user_id=user.user_id,
                image_url=saved_path,
                is_valid=True  # TODO: ส่งไปตรวจสอบด้วย AI ว่ารูปเหมาะสมไหม
            )

            db.add(new_image)
            db.commit()
            db.refresh(new_image)

            return success_response(
                "อัปโหลดรูปโมเดลสำเร็จ",
                {
                    "user_image_id": str(new_image.user_image_id),
                    "image_url": new_image.image_url,
                    "is_valid": new_image.is_valid,
                    "uploaded_at": new_image.uploaded_at.isoformat() if new_image.uploaded_at else None
                },
                201
            )

        except Exception as e:
            if saved_path:
                rollback_and_cleanup(db, saved_path)
            else:
                db.rollback()

            print(f"❌ Error uploading user tryon image: {e}")
            return error_response("อัปโหลดรูปภาพล้มเหลว", {"error": str(e)}, 500)

    @staticmethod
    def get_user_tryon_images(db: Session, user: User):
        """ดึงรูปโมเดลทั้งหมดของผู้ใช้"""
        try:
            images = (
                db.query(UserTryOnImage)
                .filter(
                    UserTryOnImage.user_id == user.user_id,
                    UserTryOnImage.is_valid == True
                )
                .order_by(UserTryOnImage.uploaded_at.desc())
                .all()
            )

            return success_response(
                "ดึงข้อมูลสำเร็จ",
                {
                    "images": [
                        {
                            "user_image_id": str(img.user_image_id),
                            "image_url": img.image_url,
                            "uploaded_at": img.uploaded_at.isoformat() if img.uploaded_at else None,
                            "is_valid": img.is_valid
                        }
                        for img in images
                    ]
                }
            )
        except Exception as e:
            return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)

    @staticmethod
    def delete_user_tryon_image(db: Session, user: User, user_image_id: UUID):
        """ลบรูปโมเดล"""
        try:
            image = (
                db.query(UserTryOnImage)
                .filter(
                    UserTryOnImage.user_image_id == user_image_id,
                    UserTryOnImage.user_id == user.user_id
                )
                .first()
            )

            if not image:
                return error_response("ไม่พบรูปภาพ", {}, 404)

            delete_file(image.image_url)

            db.delete(image)
            db.commit()

            return success_response("ลบรูปภาพสำเร็จ", {})

        except Exception as e:
            db.rollback()
            return error_response("เกิดข้อผิดพลาดในการลบรูปภาพ", {"error": str(e)}, 500)

    # ==================== GARMENT IMAGES (OUTFIT) ====================

    # @staticmethod
    # async def upload_garment_image(
    #     db: Session,
    #     user: User,
    #     file: UploadFile,
    #     name: Optional[str] = None
    # ):
    #     """อัปโหลดรูปเสื้อผ้า (Outfit) ที่ไม่เกี่ยวกับ Product (พร้อมลบพื้นหลังอัตโนมัติด้วย rembg)"""
    #     saved_path = None
    #     try:
    #         if not file.content_type or not file.content_type.startswith("image/"):
    #             return error_response("รองรับเฉพาะไฟล์รูปภาพเท่านั้น", {}, 400)

    #         content = await file.read()
    #         if len(content) > 5 * 1024 * 1024:
    #             return error_response("ขนาดไฟล์ต้องไม่เกิน 5MB", {}, 413)

    #         # ✅ ลบพื้นหลัง, crop, resize และจัดกึ่งกลางด้วย rembg
    #         print("🔄 Processing garment image with rembg (background removal)...")
    #         processed_bytes = VTONService._process_image_rembg(content, max_size=1024, padding=30)
    #         print("✅ Background removal complete for garment image")

    #         upload_dir = "app/uploads/vton/garments"
    #         unique_name = f"{uuid.uuid4().hex}.png"  # บันทึกเป็น PNG เพื่อรักษา transparency

    #         fake_upload_file = UploadFile(
    #             file=BytesIO(processed_bytes),
    #             filename=unique_name
    #         )
    #         saved_path = save_file(upload_dir, fake_upload_file, unique_name)

    #         new_garment = GarmentImage(
    #             user_id=user.user_id,
    #             name=name or "Untitled Garment",
    #             image_url=saved_path,
    #             is_valid=True  # TODO: ตรวจสอบด้วย AI
    #         )

    #         db.add(new_garment)
    #         db.commit()
    #         db.refresh(new_garment)

    #         return success_response(
    #             "อัปโหลดรูปเสื้อผ้าสำเร็จ",
    #             {
    #                 "garment_id": str(new_garment.garment_id),
    #                 "name": new_garment.name,
    #                 "image_url": new_garment.image_url,
    #                 "is_valid": new_garment.is_valid,
    #                 "uploaded_at": new_garment.uploaded_at.isoformat() if new_garment.uploaded_at else None
    #             },
    #             201
    #         )

    #     except Exception as e:
    #         if saved_path:
    #             rollback_and_cleanup(db, saved_path)
    #         else:
    #             db.rollback()

    #         print(f"❌ Error uploading garment image: {e}")
    #         return error_response("อัปโหลดรูปเสื้อผ้าล้มเหลว", {"error": str(e)}, 500)

    @staticmethod
    def get_garment_images(db: Session, user: User):
        """ดึงรูปเสื้อผ้าทั้งหมดของผู้ใช้"""
        try:
            garments = (
                db.query(GarmentImage)
                .filter(
                    GarmentImage.user_id == user.user_id,
                    GarmentImage.is_valid == True
                )
                .order_by(GarmentImage.uploaded_at.desc())
                .all()
            )

            return success_response(
                "ดึงข้อมูลสำเร็จ",
                {
                    "garments": [
                        {
                            "garment_id": str(g.garment_id),
                            "name": g.name,
                            "image_url": g.image_url,
                            "uploaded_at": g.uploaded_at.isoformat() if g.uploaded_at else None,
                            "is_valid": g.is_valid
                        }
                        for g in garments
                    ]
                }
            )
        except Exception as e:
            return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)

    @staticmethod
    def delete_garment_image(db: Session, user: User, garment_id: UUID):
        """ลบรูปเสื้อผ้า"""
        try:
            garment = (
                db.query(GarmentImage)
                .filter(
                    GarmentImage.garment_id == garment_id,
                    GarmentImage.user_id == user.user_id
                )
                .first()
            )

            if not garment:
                return error_response("ไม่พบรูปเสื้อผ้า", {}, 404)

            delete_file(garment.image_url)

            db.delete(garment)
            db.commit()

            return success_response("ลบรูปเสื้อผ้าสำเร็จ", {})

        except Exception as e:
            db.rollback()
            print(f"[GARMENT DELETE ERROR] {e}")
            return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)

    # ==================== PRODUCT GARMENTS (เสื้อจากสินค้า) ====================

    @staticmethod
    def add_product_garment(db: Session, user: User, product_id: UUID, variant_id: UUID):
        """เพิ่มสินค้าเข้า 'เสื้อจากสินค้า'"""
        try:
            variant = (
                db.query(ProductVariant)
                .filter(
                    ProductVariant.variant_id == variant_id,
                    ProductVariant.product_id == product_id,
                    ProductVariant.is_active == True
                )
                .first()
            )

            if not variant:
                return error_response("ไม่พบสินค้า", {}, 404)

            existing = (
                db.execute(
                    user_product_garments.select().where(
                        user_product_garments.c.user_id == user.user_id,
                        user_product_garments.c.variant_id == variant_id
                    )
                ).fetchone()
            )

            if existing:
                return success_response(
                    "สินค้านี้ถูกเพิ่มไว้แล้ว",
                    {"already_exists": True},
                    200
                )

            db.execute(
                user_product_garments.insert().values(
                    user_id=user.user_id,
                    variant_id=variant_id,
                    added_at=now_utc()
                )
            )
            db.commit()

            return success_response("เพิ่มสินค้าสำเร็จ", {"already_exists": False}, 201)

        except Exception as e:
            db.rollback()
            print(f"❌ Error adding product garment: {e}")
            return error_response("เพิ่มสินค้าล้มเหลว", {"error": str(e)}, 500)

    @staticmethod
    def get_product_garments(db: Session, user: User):
        """ดึงรายการเสื้อจากสินค้าทั้งหมด"""
        try:
            results = (
                db.query(ProductVariant)
                .join(
                    user_product_garments,
                    ProductVariant.variant_id == user_product_garments.c.variant_id
                )
                .filter(user_product_garments.c.user_id == user.user_id)
                .order_by(user_product_garments.c.added_at.desc())
                .all()
            )

            product_garments = []
            for variant in results:
                product_garments.append({
                    "variant_id": str(variant.variant_id),
                    "product_id": str(variant.product_id),
                    "color": variant.color,
                    "size": variant.size,
                    "name_option": variant.name_option,
                    "sku": variant.sku,
                    "price": variant.price,
                    "stock": variant.stock,
                    "is_active": variant.is_active,
                    "images": [
                        {
                            "image_id": str(img.image_id),
                            "image_url": img.image_url,
                            "image_type": img.image_type,
                            "display_order": img.display_order,
                            "is_main": img.is_main
                        }
                        for img in variant.images
                    ]
                })

            return success_response(
                "ดึงข้อมูลสำเร็จ",
                {"product_garments": product_garments}
            )

        except Exception as e:
            print(f"❌ Error getting product garments: {e}")
            return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)

    @staticmethod
    def delete_product_garment(db: Session, user: User, variant_id: UUID):
        """ลบเสื้อจากสินค้า"""
        try:
            result = db.execute(
                user_product_garments.delete().where(
                    user_product_garments.c.user_id == user.user_id,
                    user_product_garments.c.variant_id == variant_id
                )
            )

            if result.rowcount == 0:
                return error_response("ไม่พบสินค้า", {}, 404)

            db.commit()
            return success_response("ลบสินค้าสำเร็จ", {})

        except Exception as e:
            db.rollback()
            return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)

    # ==================== VTON BACKGROUNDS ====================

    @staticmethod
    async def upload_vton_background(
        db: Session,
        user: User,
        file: UploadFile,
        name: str,
        category: Optional[str] = None
    ):
        """อัปโหลดพื้นหลังส่วนตัว"""
        saved_path = None
        try:
            if not file.content_type or not file.content_type.startswith("image/"):
                return error_response("รองรับเฉพาะไฟล์รูปภาพเท่านั้น", {}, 400)

            content = await file.read()
            if len(content) > 5 * 1024 * 1024:
                return error_response("ขนาดไฟล์ต้องไม่เกิน 5MB", {}, 413)

            file.file.seek(0)

            upload_dir = "app/uploads/vton/backgrounds"
            ext = os.path.splitext(file.filename or "")[1] or ".jpg"
            unique_name = f"{uuid.uuid4().hex}{ext}"

            saved_path = save_file(upload_dir, file, unique_name)

            new_background = VTONBackground(
                name=name,
                image_url=saved_path,
                category=category,
                is_system=False,
                user_id=user.user_id,
                is_active=True
            )

            db.add(new_background)
            db.commit()
            db.refresh(new_background)

            return success_response(
                "อัปโหลดพื้นหลังสำเร็จ",
                {
                    "background_id": str(new_background.background_id),
                    "name": new_background.name,
                    "image_url": new_background.image_url,
                    "category": new_background.category,
                    "is_system": new_background.is_system
                },
                201
            )

        except Exception as e:
            if saved_path:
                rollback_and_cleanup(db, saved_path)
            else:
                db.rollback()

            print(f"❌ Error uploading background: {e}")
            return error_response("อัปโหลดพื้นหลังล้มเหลว", {"error": str(e)}, 500)

    @staticmethod
    def get_vton_backgrounds(db: Session, user: User):
        """ดึงพื้นหลังทั้งหมด (System + User's own)"""
        try:
            backgrounds = (
                db.query(VTONBackground)
                .filter(
                    VTONBackground.is_active == True,
                    (VTONBackground.is_system == True) |
                    (VTONBackground.user_id == user.user_id)
                )
                .order_by(
                    VTONBackground.is_system.desc(),
                    VTONBackground.created_at.desc()
                )
                .all()
            )

            return success_response(
                "ดึงข้อมูลสำเร็จ",
                {
                    "backgrounds": [
                        {
                            "background_id": str(bg.background_id),
                            "name": bg.name,
                            "image_url": bg.image_url,
                            "category": bg.category,
                            "is_system": bg.is_system,
                            "user_id": str(bg.user_id) if bg.user_id else None,
                            "created_at": bg.created_at.isoformat() if bg.created_at else None
                        }
                        for bg in backgrounds
                    ]
                }
            )
        except Exception as e:
            return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)

    @staticmethod
    def delete_vton_background(db: Session, user: User, background_id: UUID):
        """ลบพื้นหลัง (เฉพาะที่ผู้ใช้สร้างเอง)"""
        try:
            background = (
                db.query(VTONBackground)
                .filter(
                    VTONBackground.background_id == background_id,
                    VTONBackground.user_id == user.user_id,
                    VTONBackground.is_system == False
                )
                .first()
            )

            if not background:
                return error_response("ไม่พบพื้นหลังหรือไม่มีสิทธิ์ลบ", {}, 404)

            delete_file(background.image_url)

            db.delete(background)
            db.commit()

            return success_response("ลบพื้นหลังสำเร็จ", {})

        except Exception as e:
            db.rollback()
            return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)

    # ==================== VTON SESSION ====================

    @staticmethod
    def create_vton_session(
        db: Session,
        user: User,
        user_image_id: UUID,
        background_id: Optional[UUID] = None,
        product_id: Optional[UUID] = None,
        variant_id: Optional[UUID] = None,
        garment_id: Optional[UUID] = None,
        garment_description: str = "",
        category: str = "upper_body",
        steps: int = 30,
        seed: int = 42
    ):
        """
        สร้าง VTON Session (ลองเสื้อ) โดยเรียก IDM VTON API
        - รองรับทั้งเสื้อจาก Product (product_id + variant_id)
        - และเสื้อจาก Garment Images (garment_id)
        """
        try:
            # ✅ Validation
            if not product_id and not garment_id:
                return error_response(
                    "ต้องระบุ product_id หรือ garment_id อย่างใดอย่างหนึ่ง",
                    {},
                    400
                )

            # ✅ validate user image ownership
            user_img = (
                db.query(UserTryOnImage)
                .filter(
                    UserTryOnImage.user_image_id == user_image_id,
                    UserTryOnImage.user_id == user.user_id,
                    UserTryOnImage.is_valid == True
                )
                .first()
            )
            if not user_img:
                return error_response("ไม่พบรูปโมเดลหรือรูปไม่ผ่านการตรวจสอบ", {}, 404)

            # ✅ validate background (optional)
            if background_id:
                bg = (
                    db.query(VTONBackground)
                    .filter(
                        VTONBackground.background_id == background_id,
                        VTONBackground.is_active == True,
                        (VTONBackground.is_system == True) |
                        (VTONBackground.user_id == user.user_id)
                    )
                    .first()
                )
                if not bg:
                    return error_response("ไม่พบพื้นหลังหรือไม่มีสิทธิ์ใช้งาน", {}, 404)

            # ✅ ดึงรูปเสื้อผ้า
            garment_img_url = None
            
            if garment_id:
                # กรณีใช้ Garment Image
                garment = (
                    db.query(GarmentImage)
                    .filter(
                        GarmentImage.garment_id == garment_id,
                        GarmentImage.user_id == user.user_id,
                        GarmentImage.is_valid == True
                    )
                    .first()
                )
                if not garment:
                    return error_response("ไม่พบเสื้อผ้าหรือไม่มีสิทธิ์ใช้งาน", {}, 404)
                
                garment_img_url = garment.image_url
                
            else:
                # กรณีใช้เสื้อจาก Product (product_id + variant_id)
                if not product_id or not variant_id:
                    return error_response("ต้องระบุ product_id และ variant_id", {}, 400)

                variant = (
                    db.query(ProductVariant)
                    .filter(
                        ProductVariant.variant_id == variant_id,
                        ProductVariant.product_id == product_id,
                        ProductVariant.is_active == True
                    )
                    .first()
                )
                if not variant:
                    return error_response("ไม่พบสินค้า", {}, 404)

                images = list(getattr(variant, "images", []) or [])
                if not images:
                    return error_response("ไม่พบรูปภาพของสินค้า", {}, 404)

                main_img = next((img for img in images if getattr(img, "is_main", False)), None)
                chosen_img = main_img or images[0]
                garment_img_url = chosen_img.image_url

            # ✅ เรียก IDM VTON API
            api_result = VTONService._call_idm_vton_api(
                human_img_url=user_img.image_url,
                garment_img_url=garment_img_url,
                garment_description=garment_description,
                category=category,
                steps=steps,
                seed=seed
            )

            if not api_result.get("success"):
                return error_response("สร้างภาพลองเสื้อล้มเหลว", {"error": api_result.get("error")}, 502)

            result_image_url = api_result.get("image_url")

            session = VTONSession(
                user_id=user.user_id,
                product_id=product_id,
                variant_id=variant_id,
                garment_id=garment_id,
                user_image_id=user_image_id,
                background_id=background_id,
                result_image_url=result_image_url,
                model_used="IDM-VTON",
                generated_at=now_utc()
            )

            db.add(session)
            db.commit()
            db.refresh(session)

            return success_response(
                "สร้าง VTON Session สำเร็จ",
                {
                    "session_id": str(session.session_id),
                    "result_image_url": session.result_image_url,
                    "model_used": session.model_used,
                    "generated_at": session.generated_at.isoformat() if session.generated_at else None
                },
                201
            )

        except Exception as e:
            db.rollback()
            print(f"❌ Error creating VTON session: {e}")
            return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)
    @staticmethod
    def delete_vton_session(db: Session, user: User, session_id: UUID):
        """ลบ VTON Session และไฟล์รูปผลลัพธ์"""
        try:
            # ✅ ตรวจสอบว่า session เป็นของ user
            session = (
                db.query(VTONSession)
                .filter(
                    VTONSession.session_id == session_id,
                    VTONSession.user_id == user.user_id
                )
                .first()
            )

            if not session:
                return error_response("ไม่พบรูปผลลัพธ์หรือไม่มีสิทธิ์ลบ", {}, 404)

            # ✅ ลบไฟล์รูปผลลัพธ์ (ถ้ามี)
            if session.result_image_url:
                try:
                    delete_file(session.result_image_url)
                    print(f"✅ Deleted result image: {session.result_image_url}")
                except Exception as e:
                    print(f"⚠️ Warning: Could not delete result image file: {e}")

            # ✅ ลบ record จาก database
            db.delete(session)
            db.commit()

            return success_response("ลบรูปผลลัพธ์สำเร็จ", {})

        except Exception as e:
            db.rollback()
            print(f"❌ Error deleting VTON session: {e}")
            return error_response("เกิดข้อผิดพลาดในการลบรูปผลลัพธ์", {"error": str(e)}, 500)
        
        
    @staticmethod
    def change_background_from_session(
        db: Session,
        user: User,
        session_id: UUID,
        new_background_id: Optional[UUID]
    ):
        """
        เปลี่ยนพื้นหลังจากผลลัพธ์เดิม
        - ใช้ result_image จาก session เดิม
        - เปลี่ยนแค่พื้นหลัง
        """
        try:
            old_session = (
                db.query(VTONSession)
                .filter(
                    VTONSession.session_id == session_id,
                    VTONSession.user_id == user.user_id
                )
                .first()
            )

            if not old_session:
                return error_response("ไม่พบ Session", {}, 404)

            # validate new background (optional)
            if new_background_id:
                bg = (
                    db.query(VTONBackground)
                    .filter(
                        VTONBackground.background_id == new_background_id,
                        VTONBackground.is_active == True,
                        (VTONBackground.is_system == True) |
                        (VTONBackground.user_id == user.user_id)
                    )
                    .first()
                )
                if not bg:
                    return error_response("ไม่พบพื้นหลังหรือไม่มีสิทธิ์ใช้งาน", {}, 404)

            # TODO: เรียก AI เพื่อเปลี่ยนพื้นหลัง
            new_result_url = "https://example.com/vton_new_bg_placeholder.jpg"

            new_session = VTONSession(
                user_id=user.user_id,
                product_id=old_session.product_id,
                variant_id=old_session.variant_id,
                garment_id=getattr(old_session, "garment_id", None),  # ✅ กันพังถ้ารุ่นเก่ายังไม่มี field
                user_image_id=old_session.user_image_id,
                background_id=new_background_id,
                result_image_url=new_result_url,
                model_used="Background-Swap-v1",
                generated_at=now_utc()
            )

            db.add(new_session)
            db.commit()
            db.refresh(new_session)

            return success_response(
                "เปลี่ยนพื้นหลังสำเร็จ",
                {
                    "session_id": str(new_session.session_id),
                    "result_image_url": new_session.result_image_url,
                    "background_id": str(new_background_id) if new_background_id else None
                },
                201
            )

        except Exception as e:
            db.rollback()
            return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)

    @staticmethod
    def get_vton_sessions(
        db: Session,
        user: User,
        limit: int = 20
    ):
        """ดึงประวัติการลองเสื้อ"""
        try:
            sessions = (
                db.query(VTONSession)
                .filter(VTONSession.user_id == user.user_id)
                .order_by(VTONSession.generated_at.desc())
                .limit(limit)
                .all()
            )

            return success_response(
                "ดึงข้อมูลสำเร็จ",
                {
                    "sessions": [
                        {
                            "session_id": str(s.session_id),
                            "product_id": str(s.product_id) if s.product_id else None,
                            "variant_id": str(s.variant_id) if s.variant_id else None,
                            "garment_id": str(getattr(s, "garment_id", None)) if getattr(s, "garment_id", None) else None,
                            "result_image_url": s.result_image_url,
                            "background_id": str(s.background_id) if s.background_id else None,
                            "model_used": s.model_used,
                            "generated_at": s.generated_at.isoformat() if s.generated_at else None
                        }
                        for s in sessions
                    ]
                }
            )
        except Exception as e:
            return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)