from pydantic import BaseModel

class ProductBase(BaseModel):
    store_id: str
    name: str
    description: str | None = None
    price: float
    stock_quantity: int

   

class ProductCreate(ProductBase):
    is_active: bool = True

class ProductUpdate(ProductBase):   
    pass

class ProductResponse(ProductBase):
    id: int

    class Config:
        orm_mode = True

class ProductDelete(BaseModel):
    id: int

    class Config:
        orm_mode = True  # Enable ORM mode to work with SQLAlchemy models

   