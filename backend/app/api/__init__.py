"""
SMobile — API Router

Central router that includes all versioned sub-routers.
Extend this file as you add new route modules.
"""

from fastapi import APIRouter

api_router = APIRouter()


# ── Health Check ─────────────────────────────
@api_router.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "SMobile API"}


# ── Future route includes ────────────────────
# from app.api.routes import auth, users, listings, orders
# api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
# api_router.include_router(users.router, prefix="/users", tags=["Users"])
# api_router.include_router(listings.router, prefix="/listings", tags=["Listings"])
# api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
