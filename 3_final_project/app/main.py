from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
import stripe
from app.api import cart, checkout, home, order, product, stripe_webhook
from app.db import seed_categories
import app.models 
from app.db.database import Base, engine, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
from app.routes import admin_category_router, admin_dashboard_router, admin_store_router, admin_user_router, auth_router, category_router, chat_router, chat_ws_router, checkout_router, notification_router, order_return_router, order_router, payment_page_router, payment_router, preview_image_router, product_router, product_variant_router, profile_router, report_router, review_router, seller_notification_ws, seller_router, shipping_address_router, stock_reservation_router, store_application_router, store_dashboard_router, store_router, stripe_webhook_router, user_notification_ws, user_tryon_image_router, variant_router, vton_meta_router, vton_router, ws_router
from app.db.seed import seed_payment_methods, seed_roles

from app.utils.exception_handler import validation_exception_handler
from app.utils.scheduler import start_scheduler 

# สร้าง FastAPI app
app = FastAPI()

# 🔽 เพิ่ม exception handler
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# origins = ["https://app.example.com", "http://localhost:5173"]
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # ห้าม '*'
    allow_credentials=True,         # ต้อง True เพื่อให้ส่ง cookie
    allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    print("[Database] Tables created.")
    # seed roles ถ้าต้องการ
    db = SessionLocal()
    try:
        
        seed_roles(db)
        seed_payment_methods(db)
        
        # start_scheduler()

        # charge = stripe.Charge.create(
        # amount=100000,  # 1000.00 SGD หรือ THB (หน่วยย่อย)
        # currency="thb",  # หรือ "thb" ตามที่คุณตั้งค่า
        # source="tok_bypassPending",  # Token พิเศษให้ผ่านทันทีใน test mode
        # description="Top-up platform balance for testing payout"
        # )

        # print("Charge created:", charge.id)
    finally:
        db.close()


app.include_router(auth_router.router)
app.include_router(profile_router.router)
app.include_router(store_application_router.router)
app.include_router(store_router.router)
app.include_router(product_router.router)
app.include_router(variant_router.router)
app.include_router(preview_image_router.router)
app.include_router(vton_meta_router.router)
app.include_router(user_tryon_image_router.router)
# app.include_router(payment_router.router)
app.include_router(ws_router.router)
app.include_router(shipping_address_router.router)
# app.include_router(product_variant_router.router)
app.include_router(store_dashboard_router.router)
app.include_router(checkout_router.router)
app.include_router(stripe_webhook_router.router)
app.include_router(stock_reservation_router.router)
app.include_router(order_return_router.router)
app.include_router(order_router.router)
app.include_router(seller_router.router)
app.include_router(vton_router.router)
app.include_router(review_router.router)
app.include_router(chat_router.router)
app.include_router(chat_ws_router.router)
app.include_router(notification_router.router)
app.include_router(admin_store_router.router)
app.include_router(admin_category_router.router)  # สำหรับ admin จัดการหมวดหมู่
app.include_router(category_router.router)   
app.include_router(admin_dashboard_router.router)  
app.include_router(seller_notification_ws.router) 
app.include_router(user_notification_ws.router)     
app.include_router(admin_user_router.router) 
app.include_router(report_router.router) 


# api
app.include_router(home.router)
app.include_router(product.router)
app.include_router(cart.router)
app.include_router(checkout.router)    # validate checkout
app.include_router(payment_page_router.router)
app.include_router(stripe_webhook.router)




