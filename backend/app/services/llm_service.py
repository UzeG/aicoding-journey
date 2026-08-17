import asyncio
import json
import logging
import re
import time
from typing import AsyncGenerator

from app.schemas import normalize_tags
from app.services.library_registry import build_cdn_includes
from app.services.system_prompt import get_single_step_prompt, get_step1_prompt, get_step2_prompt

logger = logging.getLogger(__name__)

_TITLE_REGEX = re.compile(r'<!--\s*TITLE:\s*(.+?)\s*-->')


# ═══════════════════════════════════════════════════════════════════════
# Public entry point
# ═══════════════════════════════════════════════════════════════════════


async def create_two_step_stream(
    prompt: str,
    user_config: dict,
    user_id: str,
    request=None,
    page_id: int | None = None,
    *,
    persist: bool = True,
    verbose: bool = False,
    source: str = "generation",
    accent_color: str | None = None,
) -> AsyncGenerator[dict, None]:
    """Two-step HTML generation pipeline.

    Step 1: Understand user intent + select CDN libraries (non-streaming LLM call)
    Step 2: Generate HTML fragments, assemble with CDN includes (SSE streaming)

    Yields: progress events, token events, final, done, error

    keyword-only args (defaults keep the existing /api/generate caller unchanged):
      persist=False  skip Page insert + snapshot (admin test console)
      verbose=True   additionally yield "step1" and "token_raw" events with intermediate outputs
      source         trace source tag ("generation" | "test")
    """
    trace = _new_trace(prompt, user_id, user_config, source)
    try:
        # ── Step 1: Understand ──
        yield {"type": "progress", "step": "understand", "message": "正在理解需求..."}

        step1 = None
        try:
            step1 = await _run_step1_understand(prompt, user_config)
            if not step1.get("refined_prompt"):
                raise ValueError(f"Step 1 returned empty/missing refined_prompt: {step1}")
            refined_prompt = step1.get("refined_prompt", prompt)
            libraries = step1.get("libraries", [])
            tags = normalize_tags(step1.get("tags")) or []
            centered = bool(step1.get("centered", False))
            trace["refined_prompt"] = refined_prompt
            trace["libraries"] = json.dumps(libraries, ensure_ascii=False)
            trace["step1_output"] = json.dumps(step1, ensure_ascii=False)
            logger.info(f"Step 1 result: libraries={libraries}, tags={tags}, refined_prompt={refined_prompt[:100]}")
        except Exception as e:
            trace["status"] = "error"
            trace["error_message"] = f"需求分析失败: {e}"[:1000]
            logger.exception("Step 1 failed: %s", e)
            yield {"type": "error", "message": "需求分析失败，请重试"}
            return

        if verbose:
            yield {"type": "step1", "refined_prompt": refined_prompt, "libraries": libraries, "tags": tags, "centered": centered}
            yield {"type": "step1_prompt", "system": get_step1_prompt(), "user": prompt}

        # ── Step 2: Generate ──
        yield {"type": "progress", "step": "generate", "message": "正在生成页面..."}

        step1_output = json.dumps(step1, ensure_ascii=False) if step1 is not None else None

        async for event in _run_step2_generate(
            refined_prompt, libraries, user_config, user_id, step1_output, request, page_id,
            trace=trace, persist=persist, verbose=verbose, tags=tags, centered=centered, accent_color=accent_color,
        ):
            yield event
    finally:
        # Persist trace on every path (success/error/disconnect); never break the stream.
        try:
            await _persist_trace(trace)
        except Exception:
            logger.warning("Failed to persist generation trace", exc_info=True)


async def create_single_step_stream(
    prompt: str,
    user_config: dict,
    user_id: str,
    request=None,
    page_id: int | None = None,
    *,
    persist: bool = True,
    verbose: bool = False,
    source: str = "generation",
    accent_color: str | None = None,
) -> AsyncGenerator[dict, None]:
    """Single-step HTML generation pipeline (experimental strategy).

    No Step 1 refinement or library selection — the LLM writes a complete standalone
    HTML document, pasting its own CDN tags from the registry embedded in the prompt.
    The backend only normalizes doctype/charset/title (no CDN validation).

    Same SSE event protocol as two-step: progress → token → final → done → error.
    """
    trace = _new_trace(prompt, user_id, user_config, source, strategy="single_step")
    try:
        yield {"type": "progress", "step": "generate", "message": "正在生成页面..."}
        async for event in _run_single_step_generate(
            prompt, user_config, user_id, request, page_id,
            trace=trace, persist=persist, verbose=verbose, accent_color=accent_color,
        ):
            yield event
    finally:
        # Persist trace on every path (success/error/disconnect); never break the stream.
        try:
            await _persist_trace(trace)
        except Exception:
            logger.warning("Failed to persist generation trace", exc_info=True)


async def create_generation_stream(
    strategy: str,
    prompt: str,
    user_config: dict,
    user_id: str,
    request=None,
    page_id: int | None = None,
    *,
    persist: bool = True,
    verbose: bool = False,
    source: str = "generation",
    accent_color: str | None = None,
) -> AsyncGenerator[dict, None]:
    """Dispatch to the configured generation strategy (two-step default / single-step).

    Both the main /api/generate path and the admin test bench go through here, so
    changing the generation code in one place affects both entry points.
    """
    if strategy == "single_step":
        async for event in create_single_step_stream(
            prompt, user_config, user_id, request, page_id,
            persist=persist, verbose=verbose, source=source, accent_color=accent_color,
        ):
            yield event
    else:
        async for event in create_two_step_stream(
            prompt, user_config, user_id, request, page_id,
            persist=persist, verbose=verbose, source=source, accent_color=accent_color,
        ):
            yield event


def _new_trace(
    prompt: str,
    user_id: str,
    user_config: dict,
    source: str,
    strategy: str = "two_step",
) -> dict:
    """Initialize a mutable trace dict for one generation run."""
    from app.config import settings

    has_user_override = bool(
        user_config.get("api_key") or user_config.get("model") or user_config.get("base_url")
    )
    return {
        "user_id": user_id,
        "source": source,
        "strategy": strategy,
        "prompt": prompt,
        "model": user_config.get("model") or settings.LLM_MODEL,
        "base_url": user_config.get("base_url") or settings.LLM_BASE_URL,
        "config_source": "user" if has_user_override else "platform",
        "status": "success",
        "refined_prompt": None,
        "libraries": None,
        "step1_output": None,
        "step2_raw": None,
        "final_html": None,
        "tokens_used": None,
        "page_fk": None,
        "error_message": None,
        "_start": time.perf_counter(),
    }


async def _persist_trace(trace: dict) -> None:
    """Write a trace dict to generation_traces. Never raises into the caller."""
    from app.database import async_session
    from app.models import GenerationTrace

    duration_ms = int((time.perf_counter() - trace.pop("_start")) * 1000)
    trace["duration_ms"] = duration_ms
    async with async_session() as db:
        db.add(GenerationTrace(**trace))
        await db.commit()


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
        extra_body=_thinking_extra_body(),
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
    *,
    trace: dict,
    persist: bool = True,
    verbose: bool = False,
    tags: list[str] | None = None,
    centered: bool = False,
    accent_color: str | None = None,
) -> AsyncGenerator[dict, None]:
    """SSE streaming HTML fragment generation + assembly with CDN includes."""
    from openai import AsyncOpenAI

    client = _build_client(user_config)
    model = user_config.get("model") or _get_default("LLM_MODEL")

    system_prompt = get_step2_prompt(libraries, centered, accent_color)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": refined_prompt},
    ]

    if verbose:
        yield {"type": "step2_prompt", "system": system_prompt, "user": refined_prompt}

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
            extra_body=_thinking_extra_body(),
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

                if verbose:
                    yield {"type": "token_raw", "content": token}

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
        logger.info(f"Step 2 stream complete: full_content={len(full_content)} chars, tokens={total_tokens}")

        if not full_content.strip():
            logger.warning("Step 2 LLM returned empty content — aborting without saving")
            trace["status"] = "error"
            trace["error_message"] = "模型返回内容为空"
            trace["step2_raw"] = full_content
            trace["tokens_used"] = total_tokens
            yield {"type": "error", "message": "模型返回内容为空，请重试"}
            return

        raw = _extract_html(full_content)
        parsed = _parse_fragment(raw)
        if not parsed["body"] and not parsed["script"] and not parsed["style"]:
            logger.warning(f"Parsed to empty result from {len(full_content)} chars of LLM output: {full_content[:200]!r}")
            trace["status"] = "error"
            trace["error_message"] = "页面内容解析失败"
            trace["step2_raw"] = full_content
            trace["tokens_used"] = total_tokens
            yield {"type": "error", "message": "页面内容解析失败，请重试"}
            return

        llm_title, body_content = _extract_llm_title(parsed["body"])
        if not llm_title:
            llm_title = _distill_title(refined_prompt)

        assembled = _assemble_html(
            style=parsed["style"],
            body=body_content,
            script=parsed["script"],
            selected_libraries=libraries,
            title=llm_title,
            centered=centered,
        )

        trace["refined_prompt"] = refined_prompt
        trace["libraries"] = json.dumps(libraries, ensure_ascii=False)
        trace["step1_output"] = step1_output
        trace["step2_raw"] = full_content
        trace["tokens_used"] = total_tokens
        trace["final_html"] = assembled

        # Persist page record (skipped for admin test runs)
        final_page_id = None
        if persist:
            final_page_id = await _persist_page(assembled, refined_prompt, step1_output, user_id, page_id, llm_title, tags)
        trace["page_fk"] = final_page_id

        yield {"type": "final", "content": assembled}
        yield {"type": "done", "page_id": str(final_page_id), "tokens_used": total_tokens, "title": llm_title, "tags": tags or []}

    except Exception as e:
        logger.exception("Step 2 LLM call failed")
        trace["status"] = "error"
        trace["error_message"] = str(e)
        trace["step2_raw"] = full_content
        trace["tokens_used"] = total_tokens
        yield {"type": "error", "message": str(e)}


# ═══════════════════════════════════════════════════════════════════════
# Single-stage generation (experimental)
# ═══════════════════════════════════════════════════════════════════════


async def _run_single_step_generate(
    prompt: str,
    user_config: dict,
    user_id: str,
    request=None,
    page_id: int | None = None,
    *,
    trace: dict,
    persist: bool = True,
    verbose: bool = False,
    accent_color: str | None = None,
) -> AsyncGenerator[dict, None]:
    """SSE streaming single-stage generation: LLM writes a complete HTML page incl. its own CDN."""
    from openai import AsyncOpenAI

    client = _build_client(user_config)
    model = user_config.get("model") or _get_default("LLM_MODEL")
    system_prompt = get_single_step_prompt(accent_color)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    if verbose:
        yield {"type": "step2_prompt", "system": system_prompt, "user": prompt}

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
            extra_body=_thinking_extra_body(),
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

                if verbose:
                    yield {"type": "token_raw", "content": token}

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

        logger.info(f"Single-stage stream complete: full_content={len(full_content)} chars, tokens={total_tokens}")

        if not full_content.strip():
            logger.warning("Single-stage LLM returned empty content — aborting without saving")
            trace["status"] = "error"
            trace["error_message"] = "模型返回内容为空"
            trace["step2_raw"] = full_content
            trace["tokens_used"] = total_tokens
            yield {"type": "error", "message": "模型返回内容为空，请重试"}
            return

        assembled, llm_title = _assemble_single_step(full_content, prompt)
        if not assembled:
            logger.warning(f"Single-stage parse produced empty page from {len(full_content)} chars: {full_content[:200]!r}")
            trace["status"] = "error"
            trace["error_message"] = "页面内容解析失败"
            trace["step2_raw"] = full_content
            trace["tokens_used"] = total_tokens
            yield {"type": "error", "message": "页面内容解析失败，请重试"}
            return

        trace["refined_prompt"] = None
        trace["libraries"] = "[]"
        trace["step1_output"] = None
        trace["step2_raw"] = full_content
        trace["tokens_used"] = total_tokens
        trace["final_html"] = assembled

        # Persist page record (skipped for admin test runs); single-stage has no tags source → []
        final_page_id = None
        if persist:
            final_page_id = await _persist_page(assembled, prompt, None, user_id, page_id, llm_title, [])
        trace["page_fk"] = final_page_id

        yield {"type": "final", "content": assembled}
        yield {"type": "done", "page_id": str(final_page_id), "tokens_used": total_tokens, "title": llm_title, "tags": []}

    except Exception as e:
        logger.exception("Single-stage LLM call failed")
        trace["status"] = "error"
        trace["error_message"] = str(e)
        trace["step2_raw"] = full_content
        trace["tokens_used"] = total_tokens
        yield {"type": "error", "message": str(e)}


async def _persist_page(
    assembled: str,
    prompt_text: str,
    step1_output: str | None,
    user_id: str,
    page_id: int | None,
    llm_title: str,
    tags: list[str] | None = None,
) -> int | None:
    """Insert or update a Page record from a generated page + schedule its cover snapshot.

    Shared by two-step and single-step pipelines. Returns the page pk.
    """
    from app.database import async_session
    from app.models import Page
    from app.utils.snowflake import generate_id

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
            existing_page.prompt = prompt_text
            existing_page.step1_output = step1_output
            existing_page.tags = json.dumps(tags or [], ensure_ascii=False)
            existing_page.file_size = len(assembled.encode("utf-8"))
            final_page_id = existing_page.id
        else:
            new_id = generate_id()
            page = Page(
                id=new_id,
                user_id=user_id,
                title=llm_title,
                html_content=assembled,
                prompt=prompt_text,
                step1_output=step1_output,
                tags=json.dumps(tags or [], ensure_ascii=False),
                file_size=len(assembled.encode("utf-8")),
            )
            db.add(page)
            final_page_id = new_id

        await db.commit()

        # 异步生成页面封面快照（不阻塞 SSE 流式响应）
        try:
            from app.services.snapshot import capture_snapshot
            asyncio.get_running_loop().create_task(capture_snapshot(final_page_id, user_id))
        except Exception:
            logger.warning("Failed to schedule snapshot", exc_info=True)

    return final_page_id


def _assemble_single_step(raw: str, prompt: str) -> tuple[str, str]:
    """Normalize a complete HTML doc produced by the single-stage LLM.

    The LLM owns its CDN tags — we only ensure a canonical doctype/charset/title
    and extract the title for the DB record. No CDN validation (experimental knob).
    Returns (html, title), or ("", title) when there is no body content.
    Title priority: <!-- TITLE: --> comment → <title> tag → _distill_title(prompt).
    """
    from bs4 import BeautifulSoup

    html = _extract_html(raw)
    soup = BeautifulSoup(html, "html.parser")

    title = _distill_title(prompt)
    body_tag = soup.body
    body_html = body_tag.decode_contents().strip() if body_tag is not None else ""
    m = _TITLE_REGEX.search(body_html)
    if m:
        title = m.group(1).strip()
        body_html = _TITLE_REGEX.sub("", body_html, count=1).strip()

    if not body_html.strip():
        return "", title

    head_tag = soup.find("head")
    head_inner = head_tag.decode_contents().strip() if head_tag is not None else ""
    # ensure charset meta
    if "<meta charset" not in head_inner.lower():
        head_inner = f'  <meta charset="UTF-8">\n{head_inner}'
    # ensure a single <title> (LLM may have written one — replace it)
    head_inner = re.sub(r"<title[^>]*>.*?</title>", "", head_inner, flags=re.S | re.I).strip()
    head_inner = f"  <title>{title}</title>\n{head_inner}"

    return (
        f'<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n{head_inner}\n</head>\n'
        f'<body>{body_html}</body>\n</html>',
        title,
    )


# ═══════════════════════════════════════════════════════════════════════
# Fragment parsing & assembly
# ═══════════════════════════════════════════════════════════════════════


def _parse_fragment(html: str) -> dict:
    """Parse LLM output into {style, body, script} fragments using BeautifulSoup.

    Robust parsing: accepts both plain <script> and <script type="module">, multiple
    script/style blocks, and script/style nested inside <body>. Replaces brittle
    regex parsing which silently dropped JS when the LLM didn't emit type="module".
    """
    from bs4 import BeautifulSoup

    result = {"style": "", "body": "", "script": ""}
    soup = BeautifulSoup(html, "html.parser")

    # ── Style: merge all <style> blocks ──
    style_tags = soup.find_all("style")
    result["style"] = "\n".join(t.get_text() for t in style_tags).strip()

    # ── Script: all non-src <script> blocks, merged ──
    script_tags = soup.find_all("script")
    scripts = []
    for tag in script_tags:
        if tag.get("src"):
            logger.warning("LLM output contains external <script src=...>, skipped (CDN managed by registry)")
            continue
        text = tag.get_text()
        if text.strip():
            scripts.append(text)
    result["script"] = "\n\n".join(scripts).strip()

    # ── Body: strip style/script first so they aren't duplicated in body ──
    for tag in style_tags + script_tags:
        tag.decompose()
    body_tag = soup.body
    if body_tag is not None:
        result["body"] = body_tag.decode_contents().strip()
    else:
        result["body"] = soup.decode_contents().strip()

    # Strip markdown fences that LLM may have incorrectly included in body
    result["body"] = re.sub(r'^\s*```html?\s*\n?', '', result["body"])
    result["body"] = re.sub(r'\n?\s*```\s*$', '', result["body"])

    # ── Guard: surface silent JS loss instead of shipping a broken page ──
    if not result["script"]:
        lower = html.lower()
        if ("<script" in lower) or ("addeventlistener" in lower) or ("onclick" in lower) or ("onload" in lower):
            logger.warning(
                "LLM output appears to contain JS but no <script> extracted — "
                f"page may lack interactivity (style={len(result['style'])} chars, body={len(result['body'])} chars)"
            )

    return result


def _assemble_html(
    style: str,
    body: str,
    script: str,
    selected_libraries: list[str],
    title: str,
    centered: bool = False,
) -> str:
    """Assemble complete HTML page from LLM fragments + CDN includes.

    `centered`（来自 Step 1 判断）时，后端直接在 <body> 上注入单屏垂直水平居中类，
    不依赖 LLM 写外层居中容器。
    """
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

    body_attrs = ' class="h-screen overflow-hidden flex justify-center items-center"' if centered else ""
    body_parts = [f"<body{body_attrs}>{body}"]
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


def _thinking_extra_body() -> dict | None:
    """DeepSeek thinking-mode toggle. Returns 'disabled' body when thinking is off (default)."""
    from app.config import settings

    if settings.LLM_THINKING:
        return None
    return {"thinking": {"type": "disabled"}}


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
