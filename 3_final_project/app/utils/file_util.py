import os
import shutil
from typing import List
import uuid
from fastapi import Path, UploadFile
from sqlalchemy.orm import Session

# ✅ สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี
def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


# ✅ บันทึกไฟล์ (1 ไฟล์)
def save_file(upload_dir: str, file: UploadFile, filename: str = None) -> str:
    ensure_dir(upload_dir)
    filename = filename or file.filename
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return file_path.replace("\\", "/")

# ✅ บันทึกไฟล์หลายไฟล์พร้อมกัน
def save_multiple_files(upload_dir: str, files: List[UploadFile]) -> List[str]:
    """บันทึกหลายไฟล์พร้อมเปลี่ยนชื่อเป็น UUID"""
    os.makedirs(upload_dir, exist_ok=True)
    saved_paths = []
    for file in files:
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        save_path = os.path.join(upload_dir, unique_name)

        with open(save_path, "wb") as f:
            f.write(file.file.read())

        saved_paths.append(os.path.relpath(save_path, start="app"))
    return saved_paths

# ✅ อัปเดตไฟล์ (ลบของเก่า + บันทึกใหม่)
def update_file(old_path: str, upload_dir: str, file: UploadFile, filename: str = None) -> str:
    delete_file(old_path)
    return save_file(upload_dir, file, filename)

# ✅ ลบไฟล์ (ตรวจสอบก่อนว่ามี)
def delete_file(file_path: str):
    if file_path:
        cleaned = file_path.strip("/")
        if os.path.exists(cleaned):
            os.remove(cleaned)

# ✅ Rollback DB + ลบไฟล์ (เวลา error)
def rollback_and_cleanup(db: Session, file_paths: str | list[str] | None):
    try:
        db.rollback()
        if isinstance(file_paths, list):
            for path in file_paths:
                delete_file(path)
        elif isinstance(file_paths, str):
            delete_file(file_paths)
    except Exception as e:
        print("Rollback cleanup failed:", e)
