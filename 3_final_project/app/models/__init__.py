# app/models/__init__.py

from app.models.store_application import StoreApplication  
from app.models.user import User
from app.models.shipping_address import ShippingAddress
from app.models.role import Role
from app.models.store import Store
from app.models.product import Product
from app.models.cart import Cart 
from app.models.cart import CartItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.payment import Payment
from app.models.payment_method import PaymentMethodMeta
from app.models.location import Location  
from app.models.tracking_history import TrackingHistory
from app.models.wishlist import Wishlist
from app.models.review import Review
from app.models.product import ProductVariant
from app.models.product import ProductImage
from app.models.product import VTONMeta
from app.models.product import UserTryOnImage
from app.models.product import VTONSession

from sqlalchemy.orm import configure_mappers
configure_mappers()