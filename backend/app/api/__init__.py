"""
SMobile — API Router

Central router that includes all versioned sub-routers.
"""

from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.listings import router as listings_router
from app.api.v1.endpoints.orders import router as orders_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.media import router as media_router
from app.api.v1.endpoints.chat import router as chat_router

api_router = APIRouter()


# ── Health Check ─────────────────────────────
@api_router.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "SMobile API"}


# ── V1 Routers ───────────────────────────────
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(listings_router, prefix="/listings", tags=["Listings"])
api_router.include_router(orders_router, prefix="/orders", tags=["Orders"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
api_router.include_router(media_router, prefix="/media", tags=["Media"])
api_router.include_router(chat_router, prefix="/chat", tags=["Chat"])
