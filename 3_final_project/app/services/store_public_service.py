# app/services/store_public_service.py
"""
Store Public Service - ดูข้อมูลร้านค้าสาธารณะ
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, Tuple, Dict, List

from app.models.store import Store
from app.models.product import Product
from app.models.category import Category
from app.models.review import Review


def get_public_store_detail_service(
    db: Session,
    store_id: str
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดึงข้อมูลร้านค้าสาธารณะ
    
    Returns:
        (store_data, error)
    """
    try:
        store = db.query(Store).filter(
            Store.store_id == store_id,
            Store.is_active == True
        ).first()
        
        if not store:
            return None, "ไม่พบร้านค้าหรือร้านค้าถูกปิดการใช้งาน"
        
        # นับจำนวนสินค้า
        total_products = db.query(func.count(Product.product_id)).filter(
            Product.store_id == store_id,
            Product.is_active == True
        ).scalar() or 0
        
        # นับจำนวนรีวิว
        total_reviews = db.query(func.count(Review.review_id)).join(
            Product, Review.product_id == Product.product_id
        ).filter(
            Product.store_id == store_id
        ).scalar() or 0
        
        # คำนวณเรตติ้งเฉลี่ย
        avg_rating = db.query(func.avg(Review.rating)).join(
            Product, Review.product_id == Product.product_id
        ).filter(
            Product.store_id == store_id
        ).scalar() or 0.0
        
        store_data = {
            'store_id': str(store.store_id),
            'name': store.name,
            'description': store.description,
            'address': store.address,
            'logo': store.logo_path,
            'rating': float(avg_rating) if avg_rating else 0.0,
            'total_reviews': total_reviews,
            'total_products': total_products,
            'is_active': store.is_active,
        }
        
        return store_data, None
        
    except Exception as e:
        print(f"❌ [get_public_store_detail_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def get_store_products_service(
    db: Session,
    store_id: str,
    skip: int = 0,
    limit: int = 20
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดึงสินค้าทั้งหมดในร้าน
    
    Returns:
        (data, error)
    """
    try:
        # ตรวจสอบว่าร้านมีอยู่จริง
        store = db.query(Store).filter(
            Store.store_id == store_id,
            Store.is_active == True
        ).first()
        
        if not store:
            return None, "ไม่พบร้านค้า"
        
        # Query สินค้า
        query = db.query(Product).filter(
            Product.store_id == store_id,
            Product.is_active == True
        )
        
        total = query.count()
        
        products = query.order_by(desc(Product.created_at))\
                        .offset(skip)\
                        .limit(limit)\
                        .all()
        
        # Format ข้อมูลสินค้า
        products_list = []
        for product in products:
            # นับจำนวนรีวิว
            review_count = db.query(func.count(Review.review_id)).filter(
                Review.product_id == product.product_id
            ).scalar() or 0
            
            # คำนวณเรตติ้งเฉลี่ย
            avg_rating = db.query(func.avg(Review.rating)).filter(
                Review.product_id == product.product_id
            ).scalar() or 0.0
            
            # ดึงรูปแรก (is_main=True หรือรูปแรก)
            main_image = None
            if product.images and len(product.images) > 0:
                # หารูป main ก่อน
                for img in product.images:
                    if img.is_main:
                        main_image = img.image_url
                        break
                # ถ้าไม่มี main ให้ใช้รูปแรก
                if not main_image:
                    main_image = product.images[0].image_url
            
            # ดึงชื่อหมวดหมู่
            category_name = None
            if product.category_rel:
                category_name = product.category_rel.name
            elif product.category:
                category_name = product.category
            
            products_list.append({
                'product_id': str(product.product_id),
                'name': product.product_name,
                'description': product.description,
                'price': float(product.base_price),
                'image': main_image,
                'category_id': str(product.category_id) if product.category_id else None,
                'category_name': category_name,
                'stock': product.stock_quantity,
                'rating': float(avg_rating) if avg_rating else 0.0,
                'review_count': review_count,
                'created_at': product.created_at.isoformat() if product.created_at else None,
            })
        
        return {
            'products': products_list,
            'total': total,
            'skip': skip,
            'limit': limit,
        }, None
        
    except Exception as e:
        print(f"❌ [get_store_products_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def get_store_products_by_category_service(
    db: Session,
    store_id: str,
    category_id: str,
    skip: int = 0,
    limit: int = 20
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดึงสินค้าในร้านตามหมวดหมู่
    
    Returns:
        (data, error)
    """
    try:
        # ตรวจสอบว่าร้านมีอยู่จริง
        store = db.query(Store).filter(
            Store.store_id == store_id,
            Store.is_active == True
        ).first()
        
        if not store:
            return None, "ไม่พบร้านค้า"
        
        # Query สินค้าตามหมวดหมู่
        query = db.query(Product).filter(
            Product.store_id == store_id,
            Product.category_id == category_id,
            Product.is_active == True
        )
        
        total = query.count()
        
        products = query.order_by(desc(Product.created_at))\
                        .offset(skip)\
                        .limit(limit)\
                        .all()
        
        # Format ข้อมูลสินค้า
        products_list = []
        for product in products:
            # นับจำนวนรีวิว
            review_count = db.query(func.count(Review.review_id)).filter(
                Review.product_id == product.product_id
            ).scalar() or 0
            
            # คำนวณเรตติ้งเฉลี่ย
            avg_rating = db.query(func.avg(Review.rating)).filter(
                Review.product_id == product.product_id
            ).scalar() or 0.0
            
            # ดึงรูปแรก
            main_image = None
            if product.images and len(product.images) > 0:
                for img in product.images:
                    if img.is_main:
                        main_image = img.image_url
                        break
                if not main_image:
                    main_image = product.images[0].image_url
            
            # ดึงชื่อหมวดหมู่
            category_name = None
            if product.category_rel:
                category_name = product.category_rel.name
            elif product.category:
                category_name = product.category
            
            products_list.append({
                'product_id': str(product.product_id),
                'name': product.product_name,
                'description': product.description,
                'price': float(product.base_price),
                'image': main_image,
                'category_id': str(product.category_id) if product.category_id else None,
                'category_name': category_name,
                'stock': product.stock_quantity,
                'rating': float(avg_rating) if avg_rating else 0.0,
                'review_count': review_count,
                'created_at': product.created_at.isoformat() if product.created_at else None,
            })
        
        return {
            'products': products_list,
            'total': total,
            'skip': skip,
            'limit': limit,
            'category_id': category_id,
        }, None
        
    except Exception as e:
        print(f"❌ [get_store_products_by_category_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


# app/services/store_public_service.py (FIXED VERSION)

def get_store_categories_service(
    db: Session,
    store_id: str
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดึงหมวดหมู่ที่มีสินค้าในร้าน พร้อมจำนวนสินค้า
    
    ✅ FIXED: แก้ปัญหา categories ว่างเพราะ products ไม่มี category_id
    """
    try:
        from app.models.store import Store
        from app.models.product import Product
        from app.models.category import Category
        from sqlalchemy import func
        
        # ตรวจสอบว่าร้านมีอยู่จริง
        store = db.query(Store).filter(
            Store.store_id == store_id,
            Store.is_active == True
        ).first()
        
        if not store:
            return None, "ไม่พบร้านค้า"
        
        print(f"✅ [get_store_categories] Store found: {store.name}")
        
        # ✅ FIX: Query แบบง่าย - ดึง category_id ที่มีในสินค้าของร้านนี้
        category_ids_query = db.query(Product.category_id).distinct().filter(
            Product.store_id == store_id,
            Product.is_active == True,
            Product.category_id.isnot(None)  # ✅ ไม่เอา NULL
        ).all()
        
        category_ids = [cid[0] for cid in category_ids_query]
        
        print(f"📦 [get_store_categories] Found {len(category_ids)} unique categories in products")
        print(f"📦 Category IDs: {category_ids}")
        
        if not category_ids:
            print("⚠️ [get_store_categories] No products with category_id found!")
            return {
                'categories': [],
                'total_categories': 0,
            }, None
        
        # ✅ ดึงข้อมูล categories พร้อมนับสินค้า
        categories_list = []
        for cat_id in category_ids:
            # ดึงข้อมูล category
            category = db.query(Category).filter(
                Category.category_id == cat_id,
                Category.is_active == True
            ).first()
            
            if not category:
                print(f"⚠️ Category {cat_id} not found or inactive")
                continue
            
            # นับจำนวนสินค้า
            product_count = db.query(func.count(Product.product_id)).filter(
                Product.store_id == store_id,
                Product.category_id == cat_id,
                Product.is_active == True
            ).scalar() or 0
            
            print(f"✅ Category: {category.name}, Products: {product_count}")
            
            categories_list.append({
                'category_id': str(category.category_id),
                'category_name': category.name,
                'category_slug': category.slug,
                'product_count': product_count,
            })
        
        print(f"✅ [get_store_categories] Returning {len(categories_list)} categories")
        
        return {
            'categories': categories_list,
            'total_categories': len(categories_list),
        }, None
        
    except Exception as e:
        print(f"❌ [get_store_categories_service] Error: {e}")
        import traceback
        traceback.print_exc()
        return None, f"เกิดข้อผิดพลาด: {str(e)}"