"""Idempotent schema bootstrap — runs backend/db/schema.sql (BUILD.md §3.1
verbatim) once. Skips when the users table already exists.

Usage:  python -m app.db.init_db
"""
from pathlib import Path

from sqlalchemy import inspect, text
from loguru import logger

from app.db.session import get_engine

SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def init_db() -> None:
    engine = get_engine()
    with engine.connect() as conn:
        if inspect(conn).has_table("users"):
            logger.info("Schema already present — skipping DDL")
            return
        ddl = SCHEMA_PATH.read_text(encoding="utf-8")
        conn.execute(text(ddl))
        conn.commit()
        logger.info("Schema applied (uuid-ossp, vector, tables, indexes, triggers)")


if __name__ == "__main__":
    init_db()
