"""
SMobile — Application Settings

Centralised configuration loaded from environment variables / .env file.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application-wide settings, auto-loaded from .env."""

    # ── Database ─────────────────────────────
    POSTGRES_USER: str = "smobile_user"
    POSTGRES_PASSWORD: str = "smobile_dev_pass_2026"
    POSTGRES_DB: str = "smobile_db"
    DATABASE_URL: str = "postgresql://smobile_user:smobile_dev_pass_2026@localhost:5432/smobile_db"

    # ── Application ──────────────────────────
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    DEBUG: bool = True
    PROJECT_NAME: str = "SMobile API"
    API_V1_PREFIX: str = "/api/v1"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
