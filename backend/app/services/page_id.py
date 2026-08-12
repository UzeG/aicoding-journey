"""Page ID generation and validation."""

import re

from app.utils.snowflake import generate_short_code

# Format: lowercase letters, digits, hyphens, underscores, 1-50 chars
_PAGE_ID_RE = re.compile(r"^[a-z0-9_-]{1,50}$")


def validate_page_id_format(page_id: str) -> bool:
    """Check page_id format validity."""
    return bool(_PAGE_ID_RE.match(page_id))


def generate_page_id() -> str:
    """Auto-generate a unique page ID (Base62 short code)."""
    return generate_short_code()
