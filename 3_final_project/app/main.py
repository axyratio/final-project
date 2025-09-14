from fastapi import FastAPI
from app.models import user, role, otp
from app.db.database import Base, engine, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth_router, profile_router, store_application_router
from app.db.seed import seed_roles

app = FastAPI()

origins = ["https://app.example.com", "http://localhost:5173"]

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
    finally:
        db.close()


app.include_router(auth_router.router)
app.include_router(profile_router.router)
app.include_router(store_application_router.router)
