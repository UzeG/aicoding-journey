from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.config import settings
from app.models import AuditLog, Page, User
from app.schemas import PageListItem, PageResponse, PageUpdate, PublishResponse
from app.services.publish_scanner import scan_html
from app.services.sdk_injector import inject_sdk
from app.utils.snowflake import generate_short_code

router = APIRouter()
public_router = APIRouter()


# ── Authenticated routes ──


@router.get("", response_model=list[PageListItem])
async def list_pages(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Page)
        .where(Page.user_id == user.id, Page.status != "deleted")
        .order_by(Page.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/{page_id}", response_model=PageResponse)
async def get_page(
    page_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(Page.id == int(page_id), Page.user_id == user.id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


@router.put("/{page_id}", response_model=PageResponse)
async def update_page(
    page_id: str,
    req: PageUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(Page.id == int(page_id), Page.user_id == user.id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    if req.title is not None:
        page.title = req.title
    if req.html_content is not None:
        page.html_content = req.html_content
        page.file_size = len(req.html_content.encode("utf-8"))

    await db.commit()
    await db.refresh(page)
    return page


@router.post("/{page_id}/publish", response_model=PublishResponse)
async def publish_page(
    page_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(Page.id == int(page_id), Page.user_id == user.id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    # 1. Safety scan
    scan_result = await scan_html(page.html_content)
    if not scan_result["passed"]:
        raise HTTPException(status_code=400, detail=f"Content rejected: {scan_result['issues']}")

    # 2. Generate short code if not already
    if not page.short_code:
        page.short_code = generate_short_code()

    # 3. Inject platform SDK
    page.html_content = inject_sdk(page.html_content, str(page.id), page.short_code)
    page.file_size = len(page.html_content.encode("utf-8"))

    page.is_published = True
    await db.commit()
    await db.refresh(page)

    # 4. Audit log
    audit = AuditLog(user_id=user.id, action="publish", content=page.title or page.short_code, result="passed")
    db.add(audit)
    await db.commit()

    return PublishResponse(
        id=str(page.id),
        short_code=page.short_code,
        url=f"{settings.PUBLIC_BASE_URL}/p/{page.short_code}",
    )


@router.delete("/{page_id}")
async def delete_page(
    page_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(Page.id == int(page_id), Page.user_id == user.id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    page.status = "deleted"
    await db.commit()
    return {"ok": True}


# ── Public routes ──


@public_router.get("/p/{short_code}")
async def serve_page(short_code: str, db: AsyncSession = Depends(get_db)):
    """Serve a published HTML page publicly."""
    result = await db.execute(
        select(Page).where(Page.short_code == short_code, Page.is_published == True, Page.status == "active")
    )
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    return HTMLResponse(content=page.html_content, status_code=200)
