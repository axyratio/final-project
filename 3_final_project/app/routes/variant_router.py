import json
from fastapi import APIRouter, Form, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.authz import authenticate_token, authorize_role
from app.models.product import ProductImage
from app.services.variant_service import (
    create_variant_service,
    get_all_variants_service,
    get_variant_by_id_service,
    update_variant_service,
    delete_variant_service
)
from app.utils.response_handler import error_response, success_response

router = APIRouter(prefix="/variants", tags=["Variant"])

@router.get("/variant/{variant_id}/all")
def get_all_variant_images(
    variant_id: str,
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token())
):
    try:
        images = (
            db.query(ProductImage)
            .filter(ProductImage.variant_id == variant_id)
            .all()
        )

        if not images:
            return error_response("ไม่พบรูปภาพของ Variant", {}, 404)

        data = [
            {
                "image_id": str(img.image_id),
                "is_main": img.is_main,
                "display_order": img.display_order
            }
            for img in images
        ]
        return success_response("ดึงรูปภาพ Variant ทั้งหมดสำเร็จ", data)

    except Exception as e:
        return error_response("เกิดข้อผิดพลาดขณะดึงรูปภาพ Variant", {"error": str(e)}, 500)

@router.post("/create/{product_id}")
def create_variant(
    product_id: str,
    variant_data: str = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["user", "seller"]))
):
    try:
        data = json.loads(variant_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="variant_data ต้องเป็น JSON")
    return create_variant_service(db, product_id, data, image)


@router.get("/")
def get_all_variants(db: Session = Depends(get_db)):
    return get_all_variants_service(db)


@router.get("/{variant_id}")
def get_variant_by_id(variant_id: str, db: Session = Depends(get_db)):
    return get_variant_by_id_service(db, variant_id)


@router.patch("/{variant_id}/update")
def update_variant(
    variant_id: str,
    variant_data: str = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token())
):
    data = json.loads(variant_data)
    return update_variant_service(db, variant_id, data, image)


@router.delete("/{variant_id}")
def delete_variant(
    variant_id: str,
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["user", "seller"]))
):
    return delete_variant_service(db, variant_id)
