from fastapi import HTTPException
import requests
import hmac, hashlib, re, os

PEPPER = os.getenv("CITIZEN_PEPPER")  # เก็บใน Secret Manager
BASE_URL = "http://localhost:3001/citizen/validate"


def normalize_cid(cid: str) -> str:
    return re.sub(r"[^0-9]", "", cid or "")

def cid_hmac(cid: str) -> str:
    norm = normalize_cid(cid)
    return hmac.new(PEPPER.encode(), norm.encode(), hashlib.sha256).hexdigest()


def citizen_verified(card_id, first_name, last_name, birth_date):
    print(card_id, first_name, last_name, "card_id, first_name, last_name")
    try:
        res = requests.post(BASE_URL, json={
            "citizen_id": card_id,
            "first_name": first_name,
            "last_name": last_name,
            "birth_date": birth_date
        })
        
        if res.status_code == 200:
            return res.json()
        else: raise HTTPException(status_code=400, detail={ "message": "error", "response": res.json() })

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

