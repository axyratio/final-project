# @app.get("/orders/me")
# def get_user_orders(status: Optional[str] = None):
#     # ดึง orders ของ user ปัจจุบัน
#     # กรองตาม status ถ้ามี
#     pass

# @app.get("/orders/{orderId}")
# def get_order_detail(orderId: str):
#     # ดึงรายละเอียด order
#     pass

# @app.post("/orders/{orderId}/confirm-received")
# def confirm_order_received(orderId: str):
#     # เปลี่ยนสถานะเป็น DELIVERED
#     # set delivered_at = now()
#     # set can_confirm_received = False
#     # set can_review = True
#     pass

# @app.post("/orders/{orderId}/reorder")
# def reorder_items(orderId: str):
#     # เพิ่ม order_items เข้าตะกร้าของ user
#     pass