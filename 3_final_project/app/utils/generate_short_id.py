
from nanoid import generate

MAX_RETRIES = 2

def generate_uuid_id():
    return generate(size=10)  # ความยาว 10 ตัว เช่น 'D3kfGvSx7b'

def generate_role_id():
    return generate(size=10)  # ความยาว 10 ตัว เช่น 'Role

def generate_traking_number():
    return generate(size=12)  # ความยาว 12 ตัว เช่น 'A1B2C3D4E5F6'

def generate_product_id():
    return generate(size=10)  # ความยาว 8 ตัว เช่น 'XyZ12345'

def generate_store_id():
    return generate(size=10)  # ความยาว 10 ตัว เช่น 'Store12345'

def generate_order_id():
    return generate(size=10)  # ความยาว 10 ตัว เช่น 'Order

def generate_order_item_id():
    return generate(size=10)  # ความยาว 10 ตัว เช่น

def generate_shipping_address_id():
    return generate(size=10)  # ความยาว 10 ตัว เช่น 'ShipAddr123'

def generate_store_application_id():
    return generate(size=10)  # ความยาว 10 ตัว เช่น 'App1234567'
