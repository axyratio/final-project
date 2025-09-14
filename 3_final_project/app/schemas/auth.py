from typing import Optional
from pydantic import BaseModel
from uuid import UUID

class Authorize(BaseModel):

    user_id: UUID
    role: Optional[str] =None
