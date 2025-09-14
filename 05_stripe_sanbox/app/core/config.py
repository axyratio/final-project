# core/config.py
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    STRIPE_API_KEY: str = "sk_test_51RjNbVP2m5opTW0wraKjYAcJxZU5vv0YImHQg5N8VNCYcFV52a4UMhVP4nCBCYW4WAVMXVey1kvu8bGgQVdqv2Zl00AEatqLAO"   # ใช้ test key เท่านั้น
    APP_ENV: str = "sandbox"

    class Config:
        env_file = ".env"   # อ่านค่าจากไฟล์ .env ได้ถ้ามี

settings = Settings()
