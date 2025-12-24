# app/core/celery_app.py
from celery import Celery
from app.core.config import settings

# สร้าง Instance Celery
celery_app = Celery(
    "closetx_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# ตั้งค่าพื้นฐาน
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Bangkok",
    enable_utc=True,
)

# บอกให้ Celery รู้ว่า Task อยู่ที่ไหน
celery_app.conf.imports = [
    "app.utils.order_task",
]