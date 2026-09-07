"""Nivaran AI — FastAPI application assembly (BUILD.md §3/§5.4)."""
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
from sqlalchemy import text

from app.core.config import settings
from app.routers import admin_routes, auth_routes, cluster_routes, complaint_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db.init_db import init_db

    try:
        init_db()
    except Exception as exc:
        logger.error(f"DB init failed (check DATABASE_URL): {exc}")

    # Preload the embedding model (local CPU model — always available)
    try:
        from app.services.embedding_service import get_model

        get_model()
    except Exception as exc:
        logger.error(f"Embedding model preload failed: {exc}")

    # SLA escalation daemon (§2.2 smart-civic port)
    scheduler = None
    try:
        from app.services.sla_daemon import start_scheduler

        scheduler = start_scheduler()
    except Exception as exc:
        logger.error(f"SLA daemon failed to start: {exc}")

    yield

    if scheduler:
        scheduler.shutdown()
        logger.info("SLA daemon stopped")


app = FastAPI(title="Nivaran AI — Campus Problem Intelligence", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_routes.router)
app.include_router(complaint_routes.router)
app.include_router(cluster_routes.router)
app.include_router(admin_routes.router)


@app.get("/")
def home():
    return {"message": "Nivaran AI — Campus Problem Intelligence 🚀"}


@app.get("/health")
def health():
    """Health contract — BUILD.md §5.4 (exact response shape)."""
    from app.core.config import settings as s

    db_status = {"status": "disconnected", "pgvector_extension": "inactive", "active_connections": 0}
    try:
        from app.db.session import get_engine

        with get_engine().connect() as conn:
            row = conn.execute(
                text("SELECT extname FROM pg_extension WHERE extname = 'vector'")
            ).scalar()
            nconn = conn.execute(text("SELECT COUNT(*) FROM pg_stat_activity")).scalar()
            db_status = {
                "status": "connected",
                "pgvector_extension": "active" if row else "inactive",
                "active_connections": int(nconn or 0),
            }
    except Exception as exc:
        logger.warning(f"/health DB check failed: {exc}")

    embedding_status = {
        "status": "active" if not s.MOCK_AI else "mock",
        "model": s.EMBEDDING_MODEL_NAME,
        "device": "cpu",
        "mock_ai": s.MOCK_AI,
    }

    gemini_status = {"status": "healthy", "latency_ms": 0}
    if s.MOCK_AI or not s.GEMINI_API_KEY:
        gemini_status = {"status": "mock", "latency_ms": 0}
    else:
        try:
            t0 = time.perf_counter()
            import google.generativeai as genai

            genai.configure(api_key=s.GEMINI_API_KEY)
            model = genai.GenerativeModel(s.GEMINI_MODEL)
            model.generate_content("ping")
            gemini_status = {"status": "healthy", "latency_ms": int((time.perf_counter() - t0) * 1000)}
        except Exception as exc:
            logger.warning(f"/health Gemini check failed: {exc}")
            gemini_status = {"status": "unreachable", "latency_ms": 0}

    operational = db_status["status"] == "connected" and db_status["pgvector_extension"] == "active"
    return {
        "status": "operational" if operational else "degraded",
        "database": db_status,
        "embedding_service": embedding_status,
        "gemini_api": gemini_status,
    }
