from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.realtime.socket_manager import manager

router = APIRouter(prefix="/ws", tags=["WebSocket"])

@router.websocket("/orders/{order_id}")
async def ws_orders(websocket: WebSocket, order_id: str):
    await manager.connect(order_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(order_id, websocket)
