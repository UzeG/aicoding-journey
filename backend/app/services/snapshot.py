"""Page snapshot generation (cover images) via headless Chrome + Playwright.

Renders a page's html_content through the authenticated internal render endpoint
GET /api/pages/{pk}/render, waits for CDN + JS initial render, captures a 16:9
viewport screenshot, and stores it at static/snapshots/{page_pk}.png.
"""

import asyncio
import logging
import os

from app.config import settings

logger = logging.getLogger(__name__)

SNAPSHOT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "static",
    "snapshots",
)
VIEWPORT = {"width": 1280, "height": 720}  # 16:9
WAIT_AFTER_LOAD = 2.5  # seconds — let JS initial render finish (charts, wheels, etc.)
CAPTURE_TIMEOUT = 15  # seconds per snapshot
MAX_CONCURRENT = 2

# Limit concurrent Chrome screenshots (CPU/memory heavy)
_semaphore = asyncio.Semaphore(MAX_CONCURRENT)

_pw = None
_browser = None
_browser_lock = None

_CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
]


def _get_chrome_path() -> str | None:
    for path in _CHROME_CANDIDATES:
        if os.path.exists(path):
            return path
    return None


def _is_supported() -> bool:
    """Snapshots are optional — gracefully disable when Chrome/playwright missing."""
    if _get_chrome_path() is None:
        logger.warning("No Chrome/Chromium binary found — page snapshots disabled")
        return False
    try:
        import playwright  # noqa: F401
        return True
    except ImportError:
        logger.warning("playwright not installed — page snapshots disabled")
        return False


async def _get_browser():
    """Lazily launch a shared headless Chromium (reuse system Chrome if present)."""
    global _pw, _browser, _browser_lock
    if _browser_lock is None:
        _browser_lock = asyncio.Lock()
    async with _browser_lock:
        if _browser is not None and _browser.is_connected():
            return _browser
        from playwright.async_api import async_playwright

        if _pw is None:
            _pw = await async_playwright().start()
        chrome = _get_chrome_path()
        launch_kwargs = {"headless": True, "args": ["--no-sandbox", "--disable-gpu"]}
        if chrome:
            launch_kwargs["executable_path"] = chrome
        _browser = await _pw.chromium.launch(**launch_kwargs)
        logger.info("Headless Chrome launched for page snapshots")
        return _browser


async def capture_snapshot(page_pk: int, user_id: str) -> str | None:
    """Render page {page_pk} and capture a cover image.

    Returns a relative URL like /static/snapshots/123.png on success, else None.
    Never raises — failures are logged and leave cover_url unset.
    """
    if not _is_supported():
        return None

    async with _semaphore:
        try:
            from app.utils import create_access_token

            token = create_access_token(user_id)
            render_url = f"http://127.0.0.1:{settings.APP_PORT}/api/pages/{page_pk}/render"

            browser = await _get_browser()
            # JWT via context-level header (get_current_user reads Authorization header, not query)
            context = await browser.new_context(
                viewport=VIEWPORT,
                extra_http_headers={"Authorization": f"Bearer {token}"},
            )
            page = await context.new_page()
            try:
                await page.goto(render_url, wait_until="load", timeout=CAPTURE_TIMEOUT * 1000)
                # Give JS time to finish initial render (charts animate in, etc.)
                await asyncio.sleep(WAIT_AFTER_LOAD)

                os.makedirs(SNAPSHOT_DIR, exist_ok=True)
                filename = f"{page_pk}.png"
                await page.screenshot(path=os.path.join(SNAPSHOT_DIR, filename), type="png")

                # Write cover_url back to the page record
                from app.database import async_session
                from app.models import Page

                async with async_session() as db:
                    rec = await db.get(Page, page_pk)
                    if rec is not None:
                        rec.cover_url = f"/static/snapshots/{filename}"
                        await db.commit()

                logger.info(f"Snapshot captured for page {page_pk}")
                return f"/static/snapshots/{filename}"
            finally:
                await context.close()
        except Exception as e:
            logger.warning(f"Snapshot failed for page {page_pk}: {e}")
            return None


def remove_snapshot_file(cover_url: str | None) -> None:
    """Best-effort delete of a snapshot file (on page delete)."""
    if not cover_url or not cover_url.startswith("/static/snapshots/"):
        return
    path = os.path.join(SNAPSHOT_DIR, os.path.basename(cover_url))
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        logger.warning(f"Failed to remove snapshot file {path}")
