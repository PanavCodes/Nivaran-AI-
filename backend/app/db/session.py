"""SQLAlchemy engine/session — psycopg3 + pgvector adapter registration.

pgvector's psycopg adapters are registered per-connection so numpy arrays /
Python lists bind natively as `vector` columns. This keeps the verbatim SQL in
queries.py working with plain named parameters (BUILD.md §3.2).
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

_engine = None
_SessionLocal = None


def _register_pgvector(dbapi_connection):
    try:
        from pgvector.psycopg import register

        register(dbapi_connection)
    except Exception:  # pragma: no cover - pgvector ext may be absent pre-init
        pass


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=5,
            future=True,
        )
        event.listen(_engine, "connect", _register_pgvector)
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)
    return _SessionLocal


def get_db():
    """FastAPI dependency yielding a DB session."""
    db = get_session_factory()()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
