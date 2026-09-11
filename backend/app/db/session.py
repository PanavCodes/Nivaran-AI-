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


def _register_pgvector(dbapi_connection, _connection_record=None):
    try:
        from pgvector.psycopg import register

        register(dbapi_connection)
    except Exception:  # pragma: no cover - pgvector ext may be absent pre-init
        pass


def get_engine():
    global _engine
    if _engine is None:
        url = settings.DATABASE_URL
        # Normalise to the installed psycopg3 driver: SQLAlchemy otherwise
        # defaults to the psycopg2 dialect, which is not in requirements.
        # Supabase/session-pooler URLs ("postgresql+psycopg2://", "postgres://")
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        if url.startswith("postgresql+psycopg2://"):
            url = "postgresql+psycopg://" + url[len("postgresql+psycopg2://"):]
        elif url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://"):]
        _engine = create_engine(
            url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=5,
            future=True,
            connect_args={"connect_timeout": 3},
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
