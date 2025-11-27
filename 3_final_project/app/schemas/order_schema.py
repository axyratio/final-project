# from pydantic import BaseModel, Field
# from typing import Literal


# # | status      | ความหมาย                     |
# # | ----------- | ---------------------------- |
# # | `pending`   | รอดำเนินการ (ยังไม่ชำระเงิน) |
# # | `paid`      | ชำระเงินแล้ว                 |
# # | `shipped`   | ส่งของแล้ว                   |
# # | `delivered` | สินค้าถึงมือแล้ว             |
# # | `cancelled` | ยกเลิกแล้ว                   |
# # | `refunded`  | คืนเงินแล้ว (ถ้ามี)          |

# class OrderBase(BaseModel):
#     status: Literal[
#         "pending",      # รอดำเนินการ (ยังไม่ชำระเงิน)
#         "paid",         # ชำระเงินแล้ว
#         "shipped",      # ส่งของแล้ว
#         "delivered",    # สินค้าถึงมือแล้ว
#         "cancelled",    # ยกเลิกแล้ว
#         "refunded"      # คืนเงินแล้ว (ถ้ามี)
#     ] = Field(..., description="สถานะของคำสั่งซื้อ", example="pending")

#     user_id: str

