import logging
from typing import AsyncGenerator

from app.services.system_prompt import get_system_prompt

logger = logging.getLogger(__name__)

# Lazy import to avoid loading openai at module level


async def create_llm_stream(
    prompt: str,
    user_config: dict,
    user_id: str,
    request=None,
    template_id: int | None = None,
    page_id: int | None = None,
) -> AsyncGenerator[dict, None]:
    """
    Call LLM with SSE streaming. Yields {"type": "token", "content": "..."} dicts,
    then a final {"type": "done", "page_id": "...", "tokens_used": N} dict.

    If `request` (fastapi.Request) is provided, checks `request.is_disconnected()`
    periodically to abort the LLM stream early when the client disconnects.

    If `page_id` is provided and the page exists, is owned by this user, and is
    still a draft (is_published=False), the existing page is updated in-place
    instead of creating a new one. This prevents duplicate draft pages when the
    user regenerates in the same session.
    """
    from openai import AsyncOpenAI

    from app.config import settings

    # Resolve config: user_config > platform env
    api_key = user_config.get("api_key") or settings.LLM_API_KEY
    model = user_config.get("model") or settings.LLM_MODEL
    base_url = user_config.get("base_url") or settings.LLM_BASE_URL

    if not api_key:
        raise ValueError(
            "No LLM API key configured. Set it in Settings page or .env file."
        )

    # Decrypt if it's a stored (encrypted) key
    if api_key and len(api_key) > 64:
        try:
            api_key = decrypt_api_key(api_key)
        except Exception:
            pass  # Not encrypted, use as-is

    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    system_prompt = get_system_prompt(template_id=template_id)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    total_tokens = 0
    full_content = ""
    html_started = False
    buffer = ""  # Buffer tokens while waiting for HTML start marker

    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.3,
            max_tokens=32768,
            stream=True,
            stream_options={"include_usage": True},
        )

        chunk_count = 0
        async for chunk in stream:
            # Check client disconnect every ~20 chunks (avoid overhead on every chunk)
            if request is not None and chunk_count % 20 == 0:
                if await request.is_disconnected():
                    logger.info(f"Client disconnected, aborting LLM stream (user={user_id})")
                    await stream.close()  # Tell OpenAI we're done
                    return  # Exit generator without creating page record

            if chunk.choices and chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_content += token
                chunk_count += 1

                if not html_started:
                    buffer += token
                    # Detect start of HTML: either ```html fence, <!DOCTYPE, or <html tag
                    if _detect_html_start(buffer):
                        # Extract everything from the detection point onwards
                        clean = _trim_to_html_start(buffer)
                        html_started = True
                        if clean:
                            yield {"type": "token", "content": clean}
                else:
                    # Filter out closing ``` fence if present
                    yield {"type": "token", "content": token}

            if chunk.usage:
                total_tokens = chunk.usage.total_tokens

        # Extract HTML from full response (for DB storage)
        html_content = _extract_html(full_content)

        # Clean the final content for display — strip trailing ``` if present
        final_display = _strip_trailing_fence(html_content)

        # Create or update page record in DB
        from app.database import async_session
        from app.models import Page
        from app.utils.snowflake import generate_id

        final_page_id = None
        async with async_session() as db:
            # Try to reuse an existing draft page
            existing_page = None
            if page_id is not None:
                from sqlalchemy import select as _select
                result = await db.execute(
                    _select(Page).where(
                        Page.id == page_id,
                        Page.user_id == user_id,
                        Page.is_published == False,
                    )
                )
                existing_page = result.scalar_one_or_none()

            if existing_page is not None:
                # Update existing draft — no duplicate
                existing_page.title = prompt[:50]
                existing_page.html_content = html_content
                existing_page.original_prompt = prompt
                existing_page.file_size = len(html_content.encode("utf-8"))
                final_page_id = existing_page.id
            else:
                # Create new page
                new_id = generate_id()
                page = Page(
                    id=new_id,
                    user_id=user_id,
                    title=prompt[:50],
                    html_content=html_content,
                    original_prompt=prompt,
                    file_size=len(html_content.encode("utf-8")),
                )
                db.add(page)
                final_page_id = new_id

            await db.commit()

        yield {"type": "final", "content": final_display}
        yield {"type": "done", "page_id": str(final_page_id), "tokens_used": total_tokens}

    except Exception as e:
        logger.exception("LLM call failed")
        yield {"type": "error", "message": str(e)}


def _extract_html(content: str) -> str:
    """Extract HTML from LLM response. Handles ```html blocks and raw HTML."""
    # Strip markdown code fences
    if "```html" in content:
        start = content.index("```html") + 7
        end = content.rindex("```")
        if end > start:
            return content[start:end].strip()
    elif "```" in content:
        start = content.index("```") + 3
        end = content.rindex("```")
        if end > start:
            return content[start:end].strip()

    # If content contains <!DOCTYPE or <html>, treat as raw HTML
    if "<!DOCTYPE" in content.upper() or "<html" in content.lower():
        return content.strip()

    # Fallback: wrap in basic HTML
    return content.strip()


def _detect_html_start(buffer: str) -> bool:
    """Check if buffer indicates HTML content has started."""
    lowered = buffer.lower()
    # Only trigger on unambiguous markers — NOT bare ``` which could be a partial token boundary
    if "```html" in lowered:
        return True
    # Raw HTML doctype or opening tag
    if "<!doctype" in lowered or "<html" in lowered:
        return True
    return False


def _trim_to_html_start(buffer: str) -> str:
    """Strip everything before the HTML content starts. Returns the HTML portion."""
    lowered = buffer.lower()

    # Check for ```html fence (the expected format)
    if "```html" in lowered:
        idx = lowered.index("```html") + 7
        # Skip newline after the fence
        if idx < len(buffer) and buffer[idx] == "\n":
            idx += 1
        return buffer[idx:]

    # Raw HTML — find <!DOCTYPE or <html
    doctype_idx = lowered.find("<!doctype")
    html_idx = lowered.find("<html")

    if doctype_idx != -1:
        return buffer[doctype_idx:]
    if html_idx != -1:
        return buffer[html_idx:]

    # Fallback: bare ``` code fence
    if "```" in lowered:
        idx = lowered.index("```") + 3
        if idx < len(buffer) and buffer[idx] == "\n":
            idx += 1
        return buffer[idx:]

    return ""


def _strip_trailing_fence(content: str) -> str:
    """Remove trailing ``` from HTML content."""
    # Only strip if ``` appears at the very end (possibly with whitespace)
    stripped = content.rstrip()
    if stripped.endswith("```"):
        return stripped[:-3].rstrip()
    return content


def decrypt_api_key(encrypted: str) -> str:
    """Decrypt a Fernet-encrypted API key."""
    from app.config import settings

    if not settings.ENCRYPTION_KEY:
        return encrypted  # No encryption configured, return as-is
    from cryptography.fernet import Fernet

    f = Fernet(settings.ENCRYPTION_KEY.encode())
    return f.decrypt(encrypted.encode()).decode()


def encrypt_api_key(plain: str) -> str:
    """Encrypt an API key with Fernet."""
    from app.config import settings

    if not settings.ENCRYPTION_KEY:
        return plain  # No encryption configured, store as-is
    from cryptography.fernet import Fernet

    f = Fernet(settings.ENCRYPTION_KEY.encode())
    return f.encrypt(plain.encode()).decode()
