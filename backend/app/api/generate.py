import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.api.deps import get_client_ip, get_current_user, get_db
from app.config import settings
from app.models import AuditLog, User
from app.schemas import GenerateRequest
from app.services.content_filter import check_prompt
from app.services.llm_service import create_generation_stream

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate")
async def generate(
    req: GenerateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SSE streaming HTML generation.

    Strategy dispatches on settings.GENERATION_STRATEGY:
      two_step (default): Step 1 understand + select CDN libraries → Step 2 generate
      single_step: one LLM call, LLM writes the full page incl. its own CDN
    """
    # 1. Content filter
    filter_result = await check_prompt(req.prompt)
    if not filter_result["passed"]:
        raise HTTPException(status_code=400, detail=f"Content rejected: {filter_result['reason']}")

    # 2. Audit log
    client_ip = await get_client_ip(request)
    audit = AuditLog(
        user_id=user.id, action="prompt", content=req.prompt[:500], result="passed", client_ip=client_ip
    )
    db.add(audit)
    await db.commit()

    # 3. Build user config — api_key is stored encrypted, decrypted once in _build_client
    user_config = {
        "api_key": user.llm_api_key,
        "model": user.llm_model,
        "base_url": user.llm_base_url,
    }

    # 4. SSE stream (strategy from env)
    async def event_stream():
        try:
            async for event in create_generation_stream(
                settings.GENERATION_STRATEGY, req.prompt, user_config, str(user.id), request,
                page_id=req.page_id,
                accent_color=req.accent_color,
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.exception("Stream error")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
