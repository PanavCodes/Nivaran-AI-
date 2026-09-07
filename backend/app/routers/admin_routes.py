"""Admin analytics router — KPI row (§1.2) + WebSocket endpoint (§3.5)."""
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from loguru import logger
from sqlalchemy import text

from app.core.deps import get_current_user, get_db, require_role
from app.db.models import User
from app.db.queries import ANALYTICS_KPI, TOP_CATEGORY
from app.schemas.cluster_schemas import AnalyticsOut
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/analytics", response_model=AnalyticsOut)
def analytics(
    user: User = Depends(require_role("ADMIN", "FACULTY")),
    db=Depends(get_db),
):
    kpi = db.execute(ANALYTICS_KPI).mappings().one()
    top = db.execute(TOP_CATEGORY).mappings().first()
    return AnalyticsOut(
        open_clusters=int(kpi["open_clusters"]),
        avg_resolution_hours=round(float(kpi["avg_resolution_hours"]), 2),
        sla_breach_rate=round(float(kpi["sla_breach_rate"]), 2),
        top_category=top["category"] if top else "—",
    )


@router.websocket("/ws/{room}")
async def ws_endpoint(websocket: WebSocket, room: str):
    if room not in ("admin", "technician"):
        await websocket.close(code=4400)
        return
    await manager.connect(websocket, room)
    logger.info(f"WS client joined room '{room}' ({len(manager.active_connections[room])} live)")
    try:
        while True:
            # Keep-alive: client pings, server acknowledges
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text('{"event":"pong","data":{}}')
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
        logger.info(f"WS client left room '{room}'")
