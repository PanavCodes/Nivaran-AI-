"""Admin analytics router — KPI row (§1.2) + trends (§2.4 Recharts) +
WebSocket endpoint (§3.5)."""
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from loguru import logger
from sqlalchemy import text

from app.core.deps import get_current_user, get_db, require_role
from app.db.models import User
from app.db.queries import ANALYTICS_KPI, TOP_CATEGORY
from app.schemas.cluster_schemas import AnalyticsOut, TrendsOut
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])

# 14-day complaint volume (AreaChart) + per-category cluster mix (RadarChart)
TREND_VOLUME = text(
    """
SELECT to_char(days.d, 'YYYY-MM-DD') AS date,
       COUNT(c.id) AS count
FROM generate_series(
         (CURRENT_DATE - INTERVAL '13 days')::date,
         CURRENT_DATE::date,
         INTERVAL '1 day'
     ) AS days(d)
LEFT JOIN complaints c ON c.created_at::date = days.d
GROUP BY days.d
ORDER BY days.d
"""
)

TREND_CATEGORIES = text(
    """
SELECT category::text AS category, COUNT(*) AS count
FROM issue_clusters
GROUP BY category
ORDER BY count DESC
"""
)


@router.get("/analytics", response_model=AnalyticsOut)
def analytics(
    user: User = Depends(require_role("ADMIN")),
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


@router.get("/trends", response_model=TrendsOut)
def trends(
    user: User = Depends(require_role("ADMIN")),
    db=Depends(get_db),
):
    """Campus-wide trend feed — issue volume over time (AreaChart) and
    category breakdown (RadarChart) per abstract 'Analytics for identifying
    campus-wide trends and recurring issues'."""
    volume = [
        {"date": r["date"], "count": int(r["count"])}
        for r in db.execute(TREND_VOLUME).mappings().all()
    ]
    categories = [
        {"category": r["category"], "count": int(r["count"])}
        for r in db.execute(TREND_CATEGORIES).mappings().all()
    ]
    return TrendsOut(volume=volume, categories=categories)


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
