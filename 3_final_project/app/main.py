from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
import stripe
from app.api import cart, home, product
import app.models 
from app.db.database import Base, engine, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth_router, payment_router, preview_image_router, product_router, product_variant_router, profile_router, shipping_address_router, store_application_router, store_dashboard_router, store_router, user_tryon_image_router, variant_router, vton_meta_router, ws_router
from app.db.seed import seed_payment_methods, seed_roles

from app.utils.exception_handler import validation_exception_handler 

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
app.include_router(payment_router.router)
app.include_router(ws_router.router)
app.include_router(shipping_address_router.router)
# app.include_router(product_variant_router.router)
app.include_router(store_dashboard_router.router)

# api
app.include_router(home.router)
app.include_router(product.router)
app.include_router(cart.router)


