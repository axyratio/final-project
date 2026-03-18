# import stripe
# from sqlalchemy.orm import Session
# from app.core.stripe_client import *
# from app.models.order_item import OrderItem
# from app.models.payment import PaymentStatus
# from app.utils.response_handler import success_response, error_response
# from app.repositories.payment_repository import (
#     get_order, get_payment_by_order, create_payment,
#     mark_payment_success, mark_payment_failed, lock_order_paid,
#     reduce_and_lock_variants, set_order_delivered, set_order_payout_done, get_store
# )
# from app.models.order import Order
# from app.services.order_realtime_service import push_order_event

# # 4.1 Checkout: สร้าง Order + PaymentIntent (บัตรเครดิต) + lock stock
# def service_checkout_create_order_and_intent(
#     db: Session, *, user_id, items: list[dict], shipping_addr_id, customer_email: str
# ):
#     try:
#         print(items, shipping_addr_id, customer_email, user_id)

#         # ✅ 1. คำนวณยอดรวม + ล็อกสินค้า
#         total, locked_variants = reduce_and_lock_variants(db, items)

#         # ✅ 2. สร้างออเดอร์
#         order = Order(
#             user_id=user_id,
#             ship_addr_id=shipping_addr_id,
#             order_status="PENDING",
#             order_text_status="รอการชำระเงิน",
#             customer_name="N/A",       # ✅ ใส่ค่า default ป้องกัน null
#             shipping_cost=0.0,
#             courier_name="N/A",
#             total_price=total,
#             is_locked=False,
#         )
#         db.add(order)
#         db.flush()  # ✅ เพื่อให้ได้ order_id ก่อน commit

#         # ✅ 3. เพิ่มสินค้าในออเดอร์ + หักสต็อก
#         for i in items:
#             db.add(OrderItem(
#                 order_id=order.order_id,
#                 store_id=i["store_id"],
#                 product_id=i["product_id"],
#                 quantity=i["quantity"],
#                 unit_price=i["price"]
#             ))

#             # 🔒 ล็อก variant และหัก stock
#             variant = locked_variants[i["variant_id"]]
#             if variant.stock < i["quantity"]:
#                 raise Exception("Insufficient stock")
#             variant.stock -= i["quantity"]

#         # ✅ 4. เรียก Stripe เพื่อสร้าง PaymentIntent (อยู่นอก DB transaction)
#         intent = stripe.PaymentIntent.create(
#             amount=int(total * 100),
#             currency="sgd",
#             description=f"Order {order.order_id}",
#             receipt_email=customer_email,
#             automatic_payment_methods={"enabled": True},
#             metadata={"order_id": str(order.order_id)},
#             transfer_group=f"order_{order.order_id}",  # กลุ่มสำหรับโอนต่อให้ร้าน
#         )

#         print(intent.client_secret, "client secret")

#         # ✅ 5. บันทึกข้อมูลการชำระเงิน (ยังอยู่ใน session เดียวกัน)
#         create_payment(db, order_id=order.order_id, amount=total, intent_id=intent.id)

#         # ✅ 6. commit ทีเดียวหลังทุกอย่างสำเร็จ
#         db.commit()

#         return success_response("Order created & PaymentIntent ready", {
#             "order_id": str(order.order_id),
#             "payment_intent_id": intent.id,
#             "client_secret": intent.client_secret
#         })

#     except Exception as e:
#         db.rollback()
#         return error_response("Failed to checkout", {"error": str(e)})


# # 4.2 Webhook: อัปเดตผลจ่ายเงินจาก Stripe
# async def service_handle_stripe_webhook(db: Session, event):
#     try:
#         typ = event["type"]
#         obj = event["data"]["object"]

#         if typ == "payment_intent.succeeded":
#             intent_id = obj["id"]
#             order_id = obj.get("metadata", {}).get("order_id")

#             mark_payment_success(db, intent_id)
#             order = get_order(db, order_id)
#             if order:
#                 lock_order_paid(db, order, "ชำระเงินสำเร็จ / Preparing shipment")
#                 await push_order_event(order_id, "payment_update", {
#                     "status": "SUCCESS",
#                     "order_id": order_id,
#                     "payment_intent_id": intent_id
#                 })

#         elif typ == "payment_intent.payment_failed":
#             intent_id = obj["id"]
#             order_id = obj.get("metadata", {}).get("order_id")
#             mark_payment_failed(db, intent_id)
#             order = get_order(db, order_id)
#             if order:
#                 await push_order_event(order_id, "payment_update", {
#                     "status": "FAILED",
#                     "order_id": order_id,
#                     "payment_intent_id": intent_id
#                 })

#         return success_response("Webhook processed", {"event_type": typ})
#     except Exception as e:
#         db.rollback()
#         return error_response("Webhook handling error", {"error": str(e)}, status_code=500)

# # 4.3 ลูกค้ากดยืนยัน “ได้รับของแล้ว” → โอนเงินให้ร้าน (Stripe Transfer)
# def service_confirm_delivery_and_transfer(db: Session, *, order_id: str, platform_fee_rate: float = 0.05):
#     """
#     - ใช้หลังร้านกดส่งของและลูกค้ายืนยัน
#     - โอนเงินจาก platform balance ไปยังบัญชี Stripe ของ 'ร้าน' (Connected Account)
#     - หักค่าธรรมเนียมแพลตฟอร์มโดยโอนจำนวนที่น้อยกว่ายอดเต็ม
#     """
#     try:
#         order = get_order(db, order_id)
#         if not order:
#             return error_response("Order not found", status_code=404)
#         if order.order_status not in ("SHIPPED", "DELIVERED", "PROCESSING"):
#             # ยืดหยุ่นตามธุรกิจ: อนุญาต PROCESSING→DELIVERED→COMPLETED
#             pass

#         # สมมติทั้งออเดอร์เป็นของร้านเดียว (ถ้ามีหลายร้าน ต้อง split transfer ตาม store)
#         # ดึง store แรกจาก order_items
#         first_item = db.query(OrderItem).filter(OrderItem.order_id == order_id).first()
#         if not first_item:
#             return error_response("Order has no items", status_code=400)

#         store = get_store(db, first_item.store_id)
#         print(first_item.store_id, "ออเดอร์จากไอดีของร้านนี้")
#         if not store or not getattr(store, "stripe_account_id", None):
#             return error_response("Store has no Stripe connected account", status_code=400)

#         pay = get_payment_by_order(db, order_id)
#         if not pay or pay.status != PaymentStatus.SUCCESS:
#             return error_response("Payment not succeeded", status_code=400)

#         gross = int(order.total_price * 100)  # ในสตางค์
#         platform_fee = int(gross * platform_fee_rate)
#         merchant_amount = gross - platform_fee

      
#         # โอนไปบัญชีร้าน (separate charges & transfers)
#         tr = stripe.Transfer.create(
#             amount=merchant_amount,
#             currency="sgd",
#             destination=store.stripe_account_id,
#             transfer_group=f"order_{order_id}",
#         )

#         set_order_delivered(db, order, "ลูกค้ายืนยันรับของแล้ว / Transferring to merchant")
#         set_order_payout_done(db, order, "โอนเงินให้ร้านสำเร็จ / Completed")
#         return success_response("Payout to merchant queued", {
#             "order_id": str(order_id),
#             "transfer_id": tr.id,
#             "merchant_amount": merchant_amount / 100.0,
#             "platform_fee": platform_fee / 100.0
#         })
#     except Exception as e:
#         db.rollback()
#         return error_response("Payout failed", {"error": str(e)})
