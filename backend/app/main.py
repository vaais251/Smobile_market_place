"""
SMobile — FastAPI Application Entry Point

Creates the FastAPI app with CORS middleware, registers routers,
and handles database table creation on startup.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

from app.core.config import settings
from app.core.database import engine
from app.api import api_router

# ── Import all models so SQLModel registers them ──
from app.models.user import User, SellerProfile          # noqa: F401
from app.models.listing import PhoneListing, OldPhoneDetails, NewPhoneDetails  # noqa: F401
from app.models.order import Order                       # noqa: F401


# ── Lifespan ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup (dev convenience).
    In production, use Alembic migrations instead."""
    SQLModel.metadata.create_all(engine)
    yield


# ── App Factory ──────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.2.0",
    description="Enterprise-level API for the SMobile phone marketplace.",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────
# Allow requests from the frontend dev server and common origins.
# Tighten these in production to your actual domain(s).
ALLOWED_ORIGINS = [
    "http://localhost:3000",        # Next.js / React dev server
    "http://127.0.0.1:3000",
    "http://localhost:5173",        # Vite dev server
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# ── Root ─────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to SMobile API 🚀",
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }
