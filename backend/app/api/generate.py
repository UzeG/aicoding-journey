import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.api.deps import get_client_ip, get_current_user, get_db
from app.models import AuditLog, User
from app.schemas import GenerateRequest
from app.services.content_filter import check_prompt
from app.services.llm_service import create_two_step_stream

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate")
async def generate(
    req: GenerateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Two-step SSE streaming HTML generation.

    Step 1: Understand intent + select CDN libraries
    Step 2: Generate HTML with library-filtered system prompt
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

    # 3. Resolve API key
    api_key = req.api_key
    if not api_key and user.llm_api_key:
        from app.services.llm_service import decrypt_api_key
        try:
            api_key = decrypt_api_key(user.llm_api_key)
        except Exception:
            api_key = user.llm_api_key

    user_config = {
        "api_key": api_key,
        "model": req.model or user.llm_model,
        "base_url": req.base_url or user.llm_base_url,
    }

    # 4. Two-step SSE stream
    async def event_stream():
        try:
            async for event in create_two_step_stream(
                req.prompt, user_config, str(user.id), request,
                page_id=req.page_id,
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
