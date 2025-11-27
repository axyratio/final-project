import os
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.authz import authenticate_token, authorize_role
from app.models.product import ImageType, ProductImage
from app.utils.file_util import save_file
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/images", tags=["Images"])

# Directory upload
UPLOAD_DIR = "app/uploads/product/images"


@router.get("/stream/{image_id}")
def stream_image(
    image_id: str,
    db: Session = Depends(get_db),
    # auth_user=Depends(authenticate_token())
):
    image = db.query(ProductImage).filter(ProductImage.image_id == image_id).first()
    if not image:
        return error_response("ไม่พบรูปภาพ", {}, 404)

    file_path = os.path.join("app", image.image_url.lstrip("/"))
    if not os.path.exists(file_path):
        return error_response("ไม่พบไฟล์ในระบบ", {"path": file_path}, 404)

    return FileResponse(path=file_path, media_type="image/jpeg")

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    # auth_user=Depends(authenticate_token()),
    # auth_role=Depends(authorize_role(["user"])),
):
    try:
        # เช็คว่าเป็นรูปจริง ๆ
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="รองรับเฉพาะไฟล์รูปภาพเท่านั้น")

        # แยกนามสกุลไฟล์เดิม (.jpg, .png, ...)
        original_name = file.filename or ""
        ext = os.path.splitext(original_name)[1] or ".jpg"

        # ตั้งชื่อใหม่เป็น UUID
        unique_name = f"{uuid.uuid4().hex}{ext}"

        # path เต็มบนดิสก์ -> app/uploads/product/images/UUID.jpg
        full_path = os.path.join(UPLOAD_DIR, unique_name)

        # 🆕 อ่านข้อมูลไฟล์และจำกัดขนาด
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 5 MB limit
            raise HTTPException(status_code=413, detail="ขนาดไฟล์ต้องไม่เกิน 5MB")

        # เขียนไฟล์ลงดิสก์
        with open(full_path, "wb") as f:
            f.write(content)

        # ทำเป็น path relative จาก root "app" เพื่อเก็บใน DB
        # เช่น "uploads/product/images/UUID.jpg"
        rel_path = os.path.relpath(full_path, start="app").replace("\\", "/")

        # เก็บใน DB นำหน้าด้วย "/" -> "/uploads/product/images/UUID.jpg"
        image_url = "/" + rel_path

        image = ProductImage(
            product_id=None,          # ยังไม่ผูกกับ product
            variant_id=None,          # ยังไม่ผูกกับ variant
            image_url=image_url,
            image_type=ImageType.NORMAL,  # ใช้เป็นรูปปกติไว้ก่อน
            display_order=0,
            is_main=False,
        )
        db.add(image)
        db.commit()
        db.refresh(image)

        return success_response(
            "อัปโหลดรูปภาพสำเร็จ",
            {
                "image_id": str(image.image_id),
                "url": image.image_url,  # frontend ใช้ BASE_URL + url นี้
            },
            201,
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        return error_response("อัปโหลดรูปภาพล้มเหลว", {"error": str(e)}, 500)