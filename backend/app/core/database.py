"""
SMobile — Database Engine & Session

Provides the SQLModel engine, a session factory, and a FastAPI dependency
for injecting database sessions into route handlers.
"""

from sqlmodel import Session, create_engine

from app.core.config import settings

# ── Engine ───────────────────────────────────
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,       # Log SQL in debug mode
    pool_pre_ping=True,        # Verify connections before use
    pool_size=10,
    max_overflow=20,
)


# ── Dependency ───────────────────────────────
def get_session():
    """Yield a SQLModel session — used as a FastAPI dependency."""
    with Session(engine) as session:
        yield session
