from app.realtime.socket_manager import manager

async def push_order_event(order_id: str, event_type: str, data: dict):
    await manager.broadcast(str(order_id), {"type": event_type, **data})
