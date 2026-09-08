"""Unified settings module — BUILD.md §5.3 (.env.example) + §2.4 (pydantic-settings)."""
import json
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── Database ──────────────────────────────────────────────────────────
    # Supabase session pooler (port 5432) — the 6543 transaction pooler in
    # BUILD.md's example breaks SQLAlchemy prepared statements.
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/nivaran_db"

    # ── AI integrations ───────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"

    # Demo failsafe — keyword-regex fallback when the venue blocks Gemini.
    MOCK_AI: bool = False

    # ── Security ──────────────────────────────────────────────────────────
    JWT_SECRET: str = "dev-only-secret-replace-with-64-char-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # ── Frontend / CORS ───────────────────────────────────────────────────
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"
    ALLOWED_CORS_ORIGINS: str = '["http://localhost:3000"]'

    # ── Clustering tuning ─────────────────────────────────────────────────
    AUTO_CLUSTER_RADIUS_METERS: int = 50
    # Empirically calibrated with all-MiniLM-L6-v2: paraphrased duplicates of
    # the same issue score 0.55–0.92; different issues in the same room score
    # 0.37–0.46. BUILD.md's 0.78 would reject its own judge-demo merge pair
    # (0.547), so 0.52 keeps every true duplicate while separating incidents.
    MIN_SEMANTIC_SIMILARITY_THRESHOLD: float = 0.52

    # ── Vision hooks (§2.3 ports — optional) ──────────────────────────────
    LITTER_MODEL_PATH: str = "models/yolov8n.pt"

    @property
    def cors_origins(self) -> list[str]:
        try:
            origins = json.loads(self.ALLOWED_CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            origins = [o.strip() for o in self.ALLOWED_CORS_ORIGINS.split(",") if o.strip()]
        return list(origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
