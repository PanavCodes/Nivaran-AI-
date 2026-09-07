"""WebSocket connection manager — BUILD.md §3.5 (verbatim).

Rooms: "admin" (mission control) and "technician" (field console).
Broadcast events: cluster.created · cluster.merged · cluster.escalated · cluster.resolved
"""
from fastapi import WebSocket
from typing import Dict, List
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {
            "admin": [], "technician": []
        }

    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        self.active_connections.setdefault(room, []).append(websocket)

    def disconnect(self, websocket: WebSocket, room: str):
        if websocket in self.active_connections.get(room, []):
            self.active_connections[room].remove(websocket)

    async def broadcast(self, room: str, event: str, payload: dict):
        message = json.dumps({"event": event, "data": payload})
        dead = []
        for ws in self.active_connections.get(room, []):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active_connections[room].remove(ws)


manager = ConnectionManager()
