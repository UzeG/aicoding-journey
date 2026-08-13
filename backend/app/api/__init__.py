from fastapi import APIRouter

from app.api import admin, auth, generate, pages, prompts, proxy, settings

router = APIRouter()

router.include_router(auth.router, prefix="/api/auth", tags=["auth"])
router.include_router(generate.router, prefix="/api", tags=["generate"])
router.include_router(pages.router, prefix="/api/pages", tags=["pages"])
router.include_router(prompts.router, prefix="/api/prompts", tags=["prompts"])
router.include_router(settings.router, prefix="/api/settings", tags=["settings"])
router.include_router(proxy.router, prefix="/api", tags=["proxy"])
router.include_router(admin.router, prefix="/api/admin", tags=["admin"])

# Public page access router (no /api prefix)
public_router = pages.public_router

# Public user profile API
router.include_router(pages.users_router, prefix="/api/users", tags=["users"])
