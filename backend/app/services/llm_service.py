import json
import logging
import re
from typing import AsyncGenerator

from app.services.library_registry import build_cdn_includes
from app.services.system_prompt import get_step1_prompt, get_step2_prompt

logger = logging.getLogger(__name__)

_TITLE_REGEX = re.compile(r'<!--\s*TITLE:\s*(.+?)\s*-->')
_STYLE_RE = re.compile(r'<style[^>]*>(.*?)</style>', re.DOTALL | re.IGNORECASE)
_BODY_RE = re.compile(r'<body[^>]*>(.*?)</body>', re.DOTALL | re.IGNORECASE)
_SCRIPT_RE = re.compile(
    r'<script[^>]*type=["\']module["\'][^>]*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)


# ═══════════════════════════════════════════════════════════════════════
# Public entry point
# ═══════════════════════════════════════════════════════════════════════


async def create_two_step_stream(
    prompt: str,
    user_config: dict,
    user_id: str,
    request=None,
    page_id: int | None = None,
) -> AsyncGenerator[dict, None]:
    """Two-step HTML generation pipeline.

    Step 1: Understand user intent + select CDN libraries (non-streaming LLM call)
    Step 2: Generate HTML fragments, assemble with CDN includes (SSE streaming)

    Yields: progress events, token events, final, done, error
    """
    # ── Step 1: Understand ──
    yield {"type": "progress", "step": "understand", "message": "正在理解需求..."}

    step1 = None
    try:
        step1 = await _run_step1_understand(prompt, user_config)
        if not step1.get("refined_prompt"):
            raise ValueError(f"Step 1 returned empty/missing refined_prompt: {step1}")
        refined_prompt = step1.get("refined_prompt", prompt)
        libraries = step1.get("libraries", [])
        logger.info(f"Step 1 result: libraries={libraries}, refined_prompt={refined_prompt[:100]}")
    except Exception as e:
        logger.exception("Step 1 failed")
        yield {"type": "error", "message": "需求分析失败，请重试"}
        return

    # ── Step 2: Generate ──
    yield {"type": "progress", "step": "generate", "message": "正在生成页面..."}

    step1_output = json.dumps(step1, ensure_ascii=False) if step1 is not None else None

    async for event in _run_step2_generate(
        refined_prompt, libraries, user_config, user_id, step1_output, request, page_id
    ):
        yield event


# ═══════════════════════════════════════════════════════════════════════
# Step 1: Understand intent & select libraries
# ═══════════════════════════════════════════════════════════════════════


async def _run_step1_understand(prompt: str, user_config: dict) -> dict:
    """Non-streaming call: understand user prompt, output structured JSON."""
    from openai import AsyncOpenAI

    client = _build_client(user_config)
    model = user_config.get("model") or _get_default("LLM_MODEL")

    system_prompt = get_step1_prompt()

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=1024,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content or "{}"
    # Strip markdown fences if present
    if content.startswith("```"):
        content = content.split("\n", 1)[-1].rsplit("```", 1)[0]
    return json.loads(content)


# ═══════════════════════════════════════════════════════════════════════
# Step 2: Generate HTML fragments & assemble
# ═══════════════════════════════════════════════════════════════════════


async def _run_step2_generate(
    refined_prompt: str,
    libraries: list[str],
    user_config: dict,
    user_id: str,
    step1_output: str | None = None,
    request=None,
    page_id: int | None = None,
) -> AsyncGenerator[dict, None]:
    """SSE streaming HTML fragment generation + assembly with CDN includes."""
    from openai import AsyncOpenAI

    client = _build_client(user_config)
    model = user_config.get("model") or _get_default("LLM_MODEL")

    system_prompt = get_step2_prompt(libraries)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": refined_prompt},
    ]

    total_tokens = 0
    full_content = ""
    html_started = False
    buffer = ""

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
            if request is not None and chunk_count % 20 == 0:
                if await request.is_disconnected():
                    logger.info(f"Client disconnected (user={user_id})")
                    await stream.close()
                    return

            if chunk.choices and chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_content += token
                chunk_count += 1

                if not html_started:
                    buffer += token
                    if _detect_html_start(buffer):
                        clean = _trim_to_html_start(buffer)
                        html_started = True
                        if clean:
                            yield {"type": "token", "content": clean}
                else:
                    yield {"type": "token", "content": token}

            if chunk.usage:
                total_tokens = chunk.usage.total_tokens

        # ── Extract fragments, assemble complete HTML ──
        raw = _extract_html(full_content)
        parsed = _parse_fragment(raw)
        llm_title, body_content = _extract_llm_title(parsed["body"])
        if not llm_title:
            llm_title = _distill_title(refined_prompt)

        assembled = _assemble_html(
            style=parsed["style"],
            body=body_content,
            script=parsed["script"],
            selected_libraries=libraries,
            title=llm_title,
        )

        # Persist page record
        from app.database import async_session
        from app.models import Page
        from app.utils.snowflake import generate_id

        final_page_id = None
        async with async_session() as db:
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
                existing_page.title = llm_title
                existing_page.html_content = assembled
                existing_page.prompt = refined_prompt
                existing_page.step1_output = step1_output
                existing_page.file_size = len(assembled.encode("utf-8"))
                final_page_id = existing_page.id
            else:
                new_id = generate_id()
                page = Page(
                    id=new_id,
                    user_id=user_id,
                    title=llm_title,
                    html_content=assembled,
                    prompt=refined_prompt,
                    step1_output=step1_output,
                    file_size=len(assembled.encode("utf-8")),
                )
                db.add(page)
                final_page_id = new_id

            await db.commit()

        yield {"type": "final", "content": assembled}
        yield {"type": "done", "page_id": str(final_page_id), "tokens_used": total_tokens, "title": llm_title}

    except Exception as e:
        logger.exception("Step 2 LLM call failed")
        yield {"type": "error", "message": str(e)}


# ═══════════════════════════════════════════════════════════════════════
# Fragment parsing & assembly
# ═══════════════════════════════════════════════════════════════════════


def _parse_fragment(html: str) -> dict:
    """Parse LLM output into {style, body, script} fragments."""
    result = {"style": "", "body": "", "script": ""}

    m = _STYLE_RE.search(html)
    if m:
        result["style"] = m.group(1).strip()

    m = _BODY_RE.search(html)
    if m:
        result["body"] = m.group(1).strip()

    m = _SCRIPT_RE.search(html)
    if m:
        result["script"] = m.group(1).strip()

    # Fallback: if no <body> tag found, treat remaining content as body
    if not result["body"]:
        remaining = _STYLE_RE.sub("", html)
        remaining = _SCRIPT_RE.sub("", remaining)
        result["body"] = remaining.strip()

    # Strip markdown fences that LLM may have incorrectly included in body
    result["body"] = re.sub(r'^\s*```html?\s*\n?', '', result["body"])
    result["body"] = re.sub(r'\n?\s*```\s*$', '', result["body"])

    return result


def _assemble_html(
    style: str,
    body: str,
    script: str,
    selected_libraries: list[str],
    title: str,
) -> str:
    """Assemble complete HTML page from LLM fragments + CDN includes."""
    includes = build_cdn_includes(selected_libraries)

    head_parts = [
        '  <meta charset="UTF-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        f"  <title>{title}</title>",
    ]
    if includes["head"]:
        head_parts.append(f"  {includes['head']}")
    if style:
        head_parts.append(f"  <style>\n{style}\n  </style>")

    body_parts = [f"<body>{body}"]
    if includes["body_end"]:
        body_parts.append(f"  {includes['body_end']}")
    if script:
        body_parts.append(f"  <script type=\"module\">\n{script}\n  </script>")
    body_parts.append("</body>")

    head = "\n".join(head_parts)
    body_html = "\n".join(body_parts)

    return f"<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n{head}\n</head>\n{body_html}\n</html>"


# ═══════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════


def _build_client(user_config: dict):
    """Build an AsyncOpenAI client from user config. Decrypts stored API key here."""
    from openai import AsyncOpenAI

    from app.config import settings

    api_key = user_config.get("api_key") or settings.LLM_API_KEY
    base_url = user_config.get("base_url") or settings.LLM_BASE_URL

    if not api_key:
        raise ValueError("No LLM API key configured.")

    # api_key 可能来自 DB 加密存储（密文）或 env 明文——统一在此尝试解密，失败则视为明文
    try:
        api_key = decrypt_api_key(api_key)
    except Exception:
        pass

    return AsyncOpenAI(api_key=api_key, base_url=base_url)


def _get_default(key: str) -> str:
    from app.config import settings
    return getattr(settings, key, "")


def _distill_title(prompt: str) -> str:
    """Rule-based fallback: extract a short title from prompt."""
    import re as _re
    patterns = [
        _re.compile(r"^帮我生成一个?"),
        _re.compile(r"^帮我创建一个?"),
        _re.compile(r"^生成一个?"),
        _re.compile(r"^创建一个?"),
        _re.compile(r"^请帮我生成一个?"),
        _re.compile(r"^请帮我创建一个?"),
        _re.compile(r"^制作一个?"),
        _re.compile(r"^画一个?"),
        _re.compile(r"^写一个?"),
        _re.compile(r"^做一个?"),
        _re.compile(r"^设计一个?"),
    ]
    p = prompt.strip()
    if len(p) <= 10:
        return p
    for pat in patterns:
        p = pat.sub("", p, count=1)
    p = p.strip()
    return p[:10] if len(p) > 10 else p or "未命名"


def _extract_llm_title(html: str) -> tuple[str | None, str]:
    """Extract LLM-generated title from <!-- TITLE: xxx --> and remove it."""
    m = _TITLE_REGEX.search(html)
    if m:
        title = m.group(1).strip()
        html = _TITLE_REGEX.sub("", html, count=1).strip()
        return title, html
    return None, html


def _extract_html(content: str) -> str:
    """Extract HTML from LLM response."""
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
    if "<!DOCTYPE" in content.upper() or "<html" in content.lower():
        return content.strip()
    return content.strip()


def _detect_html_start(buffer: str) -> bool:
    lowered = buffer.lower()
    return "```html" in lowered or "<!doctype" in lowered or "<html" in lowered


def _trim_to_html_start(buffer: str) -> str:
    lowered = buffer.lower()
    if "```html" in lowered:
        idx = lowered.index("```html") + 7
        if idx < len(buffer) and buffer[idx] == "\n":
            idx += 1
        return buffer[idx:]
    for marker in ("<!doctype", "<html"):
        if marker in lowered:
            return buffer[lowered.index(marker):]
    if "```" in lowered:
        idx = lowered.index("```") + 3
        if idx < len(buffer) and buffer[idx] == "\n":
            idx += 1
        return buffer[idx:]
    return ""


def decrypt_api_key(encrypted: str) -> str:
    from app.config import settings
    if not settings.ENCRYPTION_KEY:
        return encrypted
    from cryptography.fernet import Fernet
    return Fernet(settings.ENCRYPTION_KEY.encode()).decrypt(encrypted.encode()).decode()


def encrypt_api_key(plain: str) -> str:
    from app.config import settings
    if not settings.ENCRYPTION_KEY:
        return plain
    from cryptography.fernet import Fernet
    return Fernet(settings.ENCRYPTION_KEY.encode()).encrypt(plain.encode()).decode()
