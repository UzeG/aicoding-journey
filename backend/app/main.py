import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import public_router, router
from app.database import init_db

logger = logging.getLogger(__name__)

# Static files (avatars etc.) — backend/static, same base as auth.py AVATAR_DIR
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
os.makedirs(os.path.join(STATIC_DIR, "avatars"), exist_ok=True)


async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB tables on startup."""
    logger.info("Initializing database tables...")
    await init_db()
    logger.info("Database tables ready.")
    yield


app = FastAPI(
    title="AI Coding HTML Hosting Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Mount API routes
app.include_router(router)
# Mount mock API routes (development-only — no real LLM calls)
from app.api.mock import router as mock_router

app.include_router(mock_router, prefix="/api")
# Mount public page access (no /api prefix) — /{user_id} and /{user_id}/{page_id}
app.include_router(public_router)
