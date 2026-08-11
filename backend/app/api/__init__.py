from fastapi import APIRouter

from app.api import auth, generate, pages, proxy, settings, templates

router = APIRouter()

router.include_router(auth.router, prefix="/api/auth", tags=["auth"])
router.include_router(generate.router, prefix="/api", tags=["generate"])
router.include_router(pages.router, prefix="/api/pages", tags=["pages"])
router.include_router(templates.router, prefix="/api/templates", tags=["templates"])
router.include_router(settings.router, prefix="/api/settings", tags=["settings"])
router.include_router(proxy.router, prefix="/api", tags=["proxy"])

# Public page access router (no /api prefix)
public_router = pages.public_router
