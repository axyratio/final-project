from fastapi import APIRouter, Depends, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.user_tryon_image import UserTryOnImageCreate, UserTryOnImageUpdate
from app.services.user_tryon_image_service import (
    service_create_user_image,
    service_get_all_user_images,
    service_get_user_image_by_id,
    service_update_user_image,
    service_delete_user_image,
)
from app.core.authz import authenticate_token, authorize_role
import uuid

router = APIRouter(prefix="/user-tryon", tags=["User Try-On Image"])

# ───────────────────────────────
# ✅ CREATE (form-data)
# ───────────────────────────────
@router.post(
    "/upload",
    dependencies=[Depends(authenticate_token())],
)
def create_user_image_with_file(
    user_id: uuid.UUID = Form(...),
    image_file: UploadFile = File(...),
    is_valid: bool = Form(True),
    db: Session = Depends(get_db),
):
    data = UserTryOnImageCreate(user_id=user_id, is_valid=is_valid)
    return service_create_user_image(db, data, image_file=image_file)

# ───────────────────────────────
# ✅ CREATE (JSON)
# ───────────────────────────────
@router.post(
    "/",
    dependencies=[Depends(authenticate_token())],
)
def create_user_image_json(data: UserTryOnImageCreate = Body(...), db: Session = Depends(get_db)):
    return service_create_user_image(db, data)

# ───────────────────────────────
# ✅ READ ALL
# ───────────────────────────────
@router.get("/", dependencies=[Depends(authenticate_token())])
def get_all_user_images(db: Session = Depends(get_db)):
    return service_get_all_user_images(db)

# ───────────────────────────────
# ✅ READ BY ID
# ───────────────────────────────
@router.get("/{user_image_id}", dependencies=[Depends(authenticate_token())])
def get_user_image(user_image_id: str, db: Session = Depends(get_db)):
    return service_get_user_image_by_id(db, user_image_id)

# ───────────────────────────────
# ✅ UPDATE (form-data)
# ───────────────────────────────
@router.patch(
    "/{user_image_id}/upload",
    dependencies=[Depends(authenticate_token())],
)
def update_user_image_with_file(
    user_image_id: str,
    image_file: UploadFile = File(...),
    is_valid: bool = Form(True),
    db: Session = Depends(get_db),
):
    data = UserTryOnImageUpdate(is_valid=is_valid)
    return service_update_user_image(db, user_image_id, data, image_file=image_file)

# ───────────────────────────────
# ✅ UPDATE (JSON)
# ───────────────────────────────
@router.patch(
    "/{user_image_id}",
    dependencies=[Depends(authenticate_token())],
)
def update_user_image_json(user_image_id: str, data: UserTryOnImageUpdate = Body(...), db: Session = Depends(get_db)):
    return service_update_user_image(db, user_image_id, data)

# ───────────────────────────────
# ✅ DELETE
# ───────────────────────────────
@router.delete(
    "/{user_image_id}",
    dependencies=[Depends(authenticate_token())],
)
def delete_user_image(user_image_id: str, db: Session = Depends(get_db)):
    return service_delete_user_image(db, user_image_id)
