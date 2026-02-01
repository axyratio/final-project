# File: app/db/seed_categories.py

from sqlalchemy.orm import Session
from app.models.category import Category
import uuid

def seed_categories(db: Session):
    categories = [
        {
            "name": "เสื้อยืด",
            "slug": "tshirt",
            "description": "เสื้อยืดทุกสไตล์",
            "background_color": "#E8F5E9",
            "display_order": 1
        },
        {
            "name": "เสื้อเชิ้ต",
            "slug": "shirt",
            "description": "เสื้อเชิ้ตแขนยาว แขนสั้น",
            "background_color": "#E3F2FD",
            "display_order": 2
        },
        {
            "name": "เสื้อทางการ",
            "slug": "formal",
            "description": "เสื้อสำหรับงานทางการ",
            "background_color": "#FFF3E0",
            "display_order": 3
        },
        {
            "name": "เสื้อน่ารัก",
            "slug": "cute",
            "description": "เสื้อสไตล์น่ารักๆ",
            "background_color": "#FCE4EC",
            "display_order": 4
        },
        {
            "name": "เสื้อกีฬา",
            "slug": "sport",
            "description": "เสื้อกีฬาทุกประเภท",
            "background_color": "#E0F2F1",
            "display_order": 5
        }
    ]
    
    for cat_data in categories:
        existing = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
        if not existing:
            category = Category(**cat_data)
            db.add(category)
    
    db.commit()
    print("✅ Seeded categories successfully")