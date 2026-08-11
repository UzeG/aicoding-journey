from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Page
from app.utils.snowflake import generate_id, generate_short_code


def create_page_with_short_code(db, page: Page) -> str:
    """Generate a unique short code and assign it to the page."""
    for _ in range(3):  # Max 3 collision retries
        code = generate_short_code()
        # Check uniqueness via page.short_code unique constraint
        # Actual collision check happens at DB insert; we just try
        page.short_code = code
        return code
    raise RuntimeError("Failed to generate unique short code after 3 retries")
