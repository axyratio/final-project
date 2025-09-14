from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, constr
from datetime import datetime, timezone, date

# import regular expression 
import re

app = FastAPI(title="Thai Citizen ID Validator (Mocked)")

@app.on_event("startup")
async def startup_event():
    print("🚀 Thai Citizen ID Validator API is running on port 3001")
    print("📌 ใช้ path:f POST /validate เพื่อทดสอบตรวจสอบบัตรประชาชน")
    print(f'body: "citizen_id": "1348600019172"\n')

    


# "----- Mock Database -----
MOCK_CITIZEN_DB = {
    "1348600019172": {
        "verified": True,
        "expiry_date": "2030-12-31",
        "first_name": "Kittiphong",
        "last_name": "U-sa",
        "birth_date": "2003-05-26"
    },
    "1234567890123": {
        "verified": True,
        "expiry_date": "2020-01-01",
        "first_name": "John",
        "last_name": "Doe",
        "birth_date": "2004-02-03"

    },
    "3101700456789": {
        "verified": True,
        "expiry_date": "2028-05-10",
        "first_name": "Mars",
        "last_name": "Rover",
        "birth_date": "2000-02-03"
    }
}

# ----- Schemas -----
class ValidationRequest(BaseModel):
    citizen_id: constr(pattern=r'^\d{13}$')
    first_name: str
    last_name: str
    birth_date: date
    

class Checks(BaseModel):
    length: bool
    checksum: bool

class ValidationResponse(BaseModel):
    citizen_id: str
    verified: bool
    checks: Checks
    timestamp: str

    class Config:
        orm_mode = True

# ----- Helper -----
def mask_citizen_id(cid: str) -> str:
    return "*" * 9 + cid[-4:]

def clean_text(value: str) -> str:
    # 1) เอาเฉพาะ ก-๙, a-z, A-Z, 0-9 และช่องว่าง
    cleaned = re.sub(r"[^ก-๙a-zA-Z0-9 ]+", "", value)
    # 2) ตัดช่องว่างเกิน
    cleaned = " ".join(cleaned.split())
    # 3) ทำให้เป็น lowercase ทั้งหมด
    return cleaned.lower()



# ----- Routes -----

@app.post("/citizen/validate", response_model=ValidationResponse)
def validate(req: ValidationRequest):
    cid = req.citizen_id

    # ใช้ UTC แล้วแปลงเป็น string ISO YYYY-MM-DD สำหรับ response
    today_utc_date = datetime.now(timezone.utc).date()
    timestamp_iso = today_utc_date.isoformat()

    record = MOCK_CITIZEN_DB.get(cid)
    if not record:
        raise HTTPException(status_code=400, detail="บัตรประชาชนไม่ถูกต้อง")

    # clean แล้วค่อยเทียบชื่อ
    record_fullname = clean_text(f"{record['first_name']} {record['last_name']}")
    fullname = clean_text(f"{req.first_name} {req.last_name}")
    if record_fullname != fullname:
        raise HTTPException(status_code=400, detail="ชื่อจริงไม่ตรงกับบัตรประชาชน")

    # แปลง expiry_date จากสตริง -> date แล้วค่อยเทียบกับ today
    expiry_date = date.fromisoformat(record["expiry_date"])  # YYYY-MM-DD -> date
    if expiry_date < today_utc_date:
        raise HTTPException(status_code=400, detail="บัตรประชาชนหมดอายุแล้ว")

    # แปลง birth_date จากสตริง -> date แล้วเทียบกับ req.birth_date (ซึ่งเป็น date อยู่แล้ว)
    record_birth_date = date.fromisoformat(record["birth_date"])
    if req.birth_date != record_birth_date:
        raise HTTPException(status_code=400, detail="วันเกิดไม่ตรงกับบัตรประชาชน")

    verified = record["verified"]

    return ValidationResponse(
        citizen_id=mask_citizen_id(cid),
        verified=verified,
        checks=Checks(
            length=len(cid) == 13,
            checksum=True,  # mock ให้ผ่าน
        ),
        timestamp=timestamp_iso  # ส่งเป็นสตริงให้ตรงกับ schema
        
    )

