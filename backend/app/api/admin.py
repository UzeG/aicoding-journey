import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.api.deps import get_current_admin, get_db, is_admin_user
from app.models import AuditLog, GenerationTrace, Page, User
from app.schemas import (
    AdminAuditLogItem,
    AdminLLMConfigsResponse,
    AdminLLMConfigUser,
    AdminPageDetail,
    AdminPageListItem,
    AdminStatsResponse,
    AdminSystemPromptsResponse,
    AdminTraceDetail,
    AdminTraceListItem,
    AdminUserDetail,
    AdminUserListItem,
    LLMSettingsResponse,
    PaginatedResponse,
    TestGenerateRequest,
)
from app.services.llm_service import create_two_step_stream
from app.services.system_prompt import get_step1_prompt, get_step2_prompt

router = APIRouter(dependencies=[Depends(get_current_admin)])
logger = logging.getLogger(__name__)

_PAGE_SIZE_MAX = 100


def _clamp_page_args(page: int, page_size: int) -> tuple[int, int]:
    return max(1, page), min(max(1, page_size), _PAGE_SIZE_MAX)


# ─────────────────────────────────────────────────────────────────────────
# Overview stats
# ─────────────────────────────────────────────────────────────────────────


@router.get("/stats", response_model=AdminStatsResponse)
async def admin_stats(db: AsyncSession = Depends(get_db)):
    users_count = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    pages_count = (
        await db.execute(
            select(func.count()).select_from(Page).where(Page.status != "deleted")
        )
    ).scalar_one()
    published_pages_count = (
        await db.execute(
            select(func.count())
            .select_from(Page)
            .where(Page.status != "deleted", Page.is_published.is_(True))
        )
    ).scalar_one()
    traces_count = (await db.execute(select(func.count()).select_from(GenerationTrace))).scalar_one()
    success_traces = (
        await db.execute(
            select(func.count()).select_from(GenerationTrace).where(GenerationTrace.status == "success")
        )
    ).scalar_one()
    error_traces = (
        await db.execute(
            select(func.count()).select_from(GenerationTrace).where(GenerationTrace.status == "error")
        )
    ).scalar_one()
    audit_count = (await db.execute(select(func.count()).select_from(AuditLog))).scalar_one()
    users_with_llm_config = (
        await db.execute(
            select(func.count())
            .select_from(User)
            .where(
                or_(
                    User.llm_model.isnot(None),
                    User.llm_base_url.isnot(None),
                    User.llm_api_key.isnot(None),
                )
            )
        )
    ).scalar_one()

    return AdminStatsResponse(
        users_count=users_count,
        pages_count=pages_count,
        published_pages_count=published_pages_count,
        traces_count=traces_count,
        success_traces=success_traces,
        error_traces=error_traces,
        audit_count=audit_count,
        users_with_llm_config=users_with_llm_config,
    )


# ─────────────────────────────────────────────────────────────────────────
# Users (read-only; api_key never exposed)
# ─────────────────────────────────────────────────────────────────────────


@router.get("/users", response_model=PaginatedResponse[AdminUserListItem])
async def admin_users(
    search: str = Query("", max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=_PAGE_SIZE_MAX),
    db: AsyncSession = Depends(get_db),
):
    page, page_size = _clamp_page_args(page, page_size)

    conds = []
    if search:
        like = f"%{search}%"
        conds.append(
            or_(User.phone.ilike(like), User.user_id.ilike(like), User.nickname.ilike(like))
        )

    count_stmt = select(func.count()).select_from(User)
    if conds:
        count_stmt = count_stmt.where(*conds)
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(User, func.count(Page.id))
        .outerjoin(Page, Page.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if conds:
        stmt = stmt.where(*conds)
    rows = (await db.execute(stmt)).all()

    items = [
        AdminUserListItem(
            id=u.id,
            phone=u.phone,
            nickname=u.nickname,
            avatar_url=u.avatar_url,
            bio=u.bio,
            user_id=u.user_id,
            token_balance=u.token_balance,
            is_admin=is_admin_user(u),
            pages_count=pages_count,
            created_at=u.created_at,
        )
        for u, pages_count in rows
    ]
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def admin_user_detail(user_id: str, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    pages_count = (
        await db.execute(
            select(func.count()).select_from(Page).where(Page.user_id == user.id, Page.status != "deleted")
        )
    ).scalar_one()

    return AdminUserDetail(
        id=user.id,
        phone=user.phone,
        nickname=user.nickname,
        avatar_url=user.avatar_url,
        bio=user.bio,
        user_id=user.user_id,
        token_balance=user.token_balance,
        is_admin=is_admin_user(user),
        pages_count=pages_count,
        created_at=user.created_at,
        llm_model=user.llm_model,
        llm_base_url=user.llm_base_url,
        has_api_key=bool(user.llm_api_key),
    )


# ─────────────────────────────────────────────────────────────────────────
# Pages (read-only)
# ─────────────────────────────────────────────────────────────────────────


@router.get("/pages", response_model=PaginatedResponse[AdminPageListItem])
async def admin_pages(
    search: str = Query("", max_length=100),
    user_id: str = Query("", max_length=50),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=_PAGE_SIZE_MAX),
    db: AsyncSession = Depends(get_db),
):
    page, page_size = _clamp_page_args(page, page_size)

    base = select(Page).where(Page.status != "deleted")
    conds = []
    if search:
        like = f"%{search}%"
        conds.append(
            or_(Page.title.ilike(like), Page.page_id.ilike(like), Page.prompt.ilike(like))
        )
    if user_id:
        conds.append(Page.user_id == user_id)
    if conds:
        base = base.where(*conds)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    stmt = (
        select(Page, User.nickname)
        .join(User, User.id == Page.user_id)
        .where(Page.status != "deleted")
        .order_by(Page.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if conds:
        stmt = stmt.where(*conds)
    rows = (await db.execute(stmt)).all()

    items = [
        AdminPageListItem(
            id=str(p.id),
            page_id=p.page_id,
            user_id=p.user_id,
            user_nickname=nickname,
            title=p.title,
            cover_url=p.cover_url,
            is_published=p.is_published,
            is_saved=p.is_saved,
            visibility=p.visibility,
            status=p.status,
            file_size=p.file_size,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p, nickname in rows
    ]
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/pages/{pk}", response_model=AdminPageDetail)
async def admin_page_detail(pk: str, db: AsyncSession = Depends(get_db)):
    try:
        pk_int = int(pk)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid page id")

    row = (
        await db.execute(
            select(Page, User.nickname)
            .join(User, User.id == Page.user_id)
            .where(Page.id == pk_int)
        )
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Page not found")
    p, nickname = row

    return AdminPageDetail(
        id=str(p.id),
        page_id=p.page_id,
        user_id=p.user_id,
        user_nickname=nickname,
        title=p.title,
        cover_url=p.cover_url,
        is_published=p.is_published,
        is_saved=p.is_saved,
        visibility=p.visibility,
        status=p.status,
        file_size=p.file_size,
        created_at=p.created_at,
        updated_at=p.updated_at,
        prompt=p.prompt,
        step1_output=p.step1_output,
        html_content=p.html_content,
    )


# ─────────────────────────────────────────────────────────────────────────
# Generation traces
# ─────────────────────────────────────────────────────────────────────────


@router.get("/traces", response_model=PaginatedResponse[AdminTraceListItem])
async def admin_traces(
    source: str = Query("", max_length=20),
    status: str = Query("", max_length=20),
    search: str = Query("", max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=_PAGE_SIZE_MAX),
    db: AsyncSession = Depends(get_db),
):
    page, page_size = _clamp_page_args(page, page_size)

    conds = []
    if source:
        conds.append(GenerationTrace.source == source)
    if status:
        conds.append(GenerationTrace.status == status)
    if search:
        like = f"%{search}%"
        conds.append(GenerationTrace.prompt.ilike(like))

    count_stmt = select(func.count()).select_from(GenerationTrace)
    stmt = select(GenerationTrace).order_by(GenerationTrace.created_at.desc())
    if conds:
        count_stmt = count_stmt.where(*conds)
        stmt = stmt.where(*conds)

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (
        await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))
    ).scalars().all()

    items = [AdminTraceListItem.model_validate(t) for t in rows]
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/traces/{trace_id}", response_model=AdminTraceDetail)
async def admin_trace_detail(trace_id: str, db: AsyncSession = Depends(get_db)):
    trace = (
        await db.execute(select(GenerationTrace).where(GenerationTrace.id == trace_id))
    ).scalar_one_or_none()
    if trace is None:
        raise HTTPException(status_code=404, detail="Trace not found")
    return AdminTraceDetail.model_validate(trace)


# ─────────────────────────────────────────────────────────────────────────
# Audit logs
# ─────────────────────────────────────────────────────────────────────────


@router.get("/audit-logs", response_model=PaginatedResponse[AdminAuditLogItem])
async def admin_audit_logs(
    search: str = Query("", max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=_PAGE_SIZE_MAX),
    db: AsyncSession = Depends(get_db),
):
    page, page_size = _clamp_page_args(page, page_size)

    conds = []
    if search:
        like = f"%{search}%"
        conds.append(or_(AuditLog.action.ilike(like), AuditLog.content.ilike(like)))

    count_stmt = select(func.count()).select_from(AuditLog)
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if conds:
        count_stmt = count_stmt.where(*conds)
        stmt = stmt.where(*conds)

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (
        await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))
    ).scalars().all()

    items = [AdminAuditLogItem.model_validate(a) for a in rows]
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


# ─────────────────────────────────────────────────────────────────────────
# LLM configs & system prompts (read-only reference for prompt iteration)
# ─────────────────────────────────────────────────────────────────────────


@router.get("/llm-configs", response_model=AdminLLMConfigsResponse)
async def admin_llm_configs(db: AsyncSession = Depends(get_db)):
    from app.config import settings

    platform = LLMSettingsResponse(
        model=settings.LLM_MODEL,
        base_url=settings.LLM_BASE_URL,
        has_api_key=bool(settings.LLM_API_KEY),
    )

    users = (
        await db.execute(
            select(User).where(
                or_(
                    User.llm_model.isnot(None),
                    User.llm_base_url.isnot(None),
                    User.llm_api_key.isnot(None),
                )
            )
        )
    ).scalars().all()

    user_items = [
        AdminLLMConfigUser(
            user_id=u.user_id,
            nickname=u.nickname,
            phone=u.phone,
            model=u.llm_model,
            base_url=u.llm_base_url,
            has_api_key=bool(u.llm_api_key),
        )
        for u in users
    ]
    return AdminLLMConfigsResponse(platform=platform, users=user_items)


@router.get("/system-prompts", response_model=AdminSystemPromptsResponse)
async def admin_system_prompts():
    return AdminSystemPromptsResponse(
        step1=get_step1_prompt(),
        # Step 2 prompt is library-dependent; show the base (no-library) version.
        step2=get_step2_prompt([]),
    )


# ─────────────────────────────────────────────────────────────────────────
# Online test console (admin-only, verbose SSE stream, no Page persistence)
# ─────────────────────────────────────────────────────────────────────────


@router.post("/test-generate")
async def admin_test_generate(
    req: TestGenerateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_admin),
):
    """Stream a two-step generation with intermediate outputs for prompt iteration.

    Unlike /api/generate: admin-only, skips content filter, does not persist a Page,
    yields extra "step1" / "token_raw" events, records a trace with source="test".
    api_key (if provided) lives only in this request — never stored, logged or traced.
    """
    cfg = req.config
    user_config = {
        "api_key": cfg.api_key if cfg else None,
        "model": cfg.model if cfg else None,
        "base_url": cfg.base_url if cfg else None,
    }

    db.add(AuditLog(user_id=user.id, action="admin_test", content=req.prompt[:500], result="ok"))
    await db.commit()

    async def event_stream():
        try:
            async for event in create_two_step_stream(
                req.prompt,
                user_config,
                str(user.id),
                request,
                persist=False,
                verbose=True,
                source="test",
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.exception("Admin test-generate stream error")
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
