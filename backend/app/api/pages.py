from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_optional_user
from app.config import settings
from app.models import AuditLog, Page, PageIdRedirect, User
from app.schemas import (
    CheckPageIdResponse,
    PageListItem,
    PageResponse,
    PageUpdate,
    PublishRequest,
    PublishResponse,
    SaveDraftRequest,
    UpdatePageIdRequest,
    UserProfileResponse,
    UserPublicResponse,
)
from app.services.page_id import generate_page_id, validate_page_id_format
from app.services.publish_scanner import scan_html
from app.services.sdk_injector import inject_sdk
from app.services.snapshot import remove_snapshot_file

router = APIRouter()
public_router = APIRouter()
users_router = APIRouter()


# ── Authenticated routes ──


@router.get("", response_model=list[PageListItem])
async def list_pages(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Page)
        .where(Page.user_id == user.id, Page.status != "deleted", or_(Page.is_published == True, Page.is_saved == True))
        .order_by(Page.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/check-id", response_model=CheckPageIdResponse)
async def check_page_id(
    page_id: str = Query(..., min_length=1, max_length=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if a page_id is available for the current user (case-insensitive)."""
    if not validate_page_id_format(page_id.lower()):
        return CheckPageIdResponse(available=False)

    result = await db.execute(
        select(Page).where(
            Page.user_id == user.id,
            func.lower(Page.page_id) == page_id.lower(),
        )
    )
    existing = result.scalar_one_or_none()
    return CheckPageIdResponse(available=existing is None)


@router.get("/{pk}", response_model=PageResponse)
async def get_page(
    pk: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(Page.id == int(pk), Page.user_id == user.id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


@router.put("/{pk}", response_model=PageResponse)
async def update_page(
    pk: str,
    req: PageUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(Page.id == int(pk), Page.user_id == user.id))
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


@router.post("/{pk}/publish", response_model=PublishResponse)
async def publish_page(
    pk: str,
    req: PublishRequest = PublishRequest(),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(Page.id == int(pk), Page.user_id == user.id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    if req.title is not None:
        page.title = req.title

    # Resolve page_id: user-provided → validate + check uniqueness; otherwise auto-generate
    if req.page_id and req.page_id.strip():
        custom_id = req.page_id.strip()
        if not validate_page_id_format(custom_id.lower()):
            raise HTTPException(status_code=400, detail="Page ID format invalid. Use letters, numbers, hyphens, underscores (1-50 chars).")
        # Check uniqueness within user (case-insensitive)
        existing = await db.execute(
            select(Page).where(
                Page.user_id == user.id,
                func.lower(Page.page_id) == custom_id.lower(),
                Page.id != int(pk),
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="This page ID is already taken. Choose another.")
        # If changing an existing page_id, record redirect
        if page.page_id and page.page_id.lower() != custom_id.lower():
            db.add(PageIdRedirect(page_fk=page.id, old_page_id=page.page_id))
        page.page_id = custom_id
    elif not page.page_id:
        page.page_id = generate_page_id()

    # 1. Safety scan
    scan_result = await scan_html(page.html_content)
    if not scan_result["passed"]:
        raise HTTPException(status_code=400, detail=f"Content rejected: {scan_result['issues']}")

    # 2. Inject platform SDK
    page.html_content = inject_sdk(page.html_content, str(page.id), page.page_id)
    page.file_size = len(page.html_content.encode("utf-8"))

    page.is_published = True
    await db.commit()
    await db.refresh(page)

    # 3. Audit log
    audit = AuditLog(user_id=user.id, action="publish", content=page.title or page.page_id, result="passed")
    db.add(audit)
    await db.commit()

    return PublishResponse(
        id=str(page.id),
        page_id=page.page_id,
        url=f"{settings.PUBLIC_BASE_URL}/{user.user_id}/{page.page_id}",
    )


@router.put("/{pk}/page-id")
async def update_page_id(
    pk: str,
    req: UpdatePageIdRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change a page's page_id (preserves old page_id as redirect)."""
    result = await db.execute(select(Page).where(Page.id == int(pk), Page.user_id == user.id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    new_id = req.page_id.strip()
    if not validate_page_id_format(new_id.lower()):
        raise HTTPException(status_code=400, detail="Page ID format invalid.")

    # Check uniqueness (case-insensitive, excluding self)
    existing = await db.execute(
        select(Page).where(
            Page.user_id == user.id,
            func.lower(Page.page_id) == new_id.lower(),
            Page.id != int(pk),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This page ID is already taken.")

    # Record redirect from old → new
    if page.page_id:
        db.add(PageIdRedirect(page_fk=page.id, old_page_id=page.page_id))

    page.page_id = new_id
    await db.commit()
    return {"page_id": page.page_id, "url": f"{settings.PUBLIC_BASE_URL}/{user.user_id}/{page.page_id}"}


@router.post("/{pk}/save-draft")
async def save_draft(
    pk: str,
    req: SaveDraftRequest = SaveDraftRequest(),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(Page.id == int(pk), Page.user_id == user.id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    # 已发布页面被存草稿 → 派生一个草稿副本，原发布页保持不变
    if page.is_published:
        from app.utils.snowflake import generate_id

        draft_id = generate_id()
        draft = Page(
            id=draft_id,
            user_id=user.id,
            title=req.title if req.title is not None else page.title,
            html_content=page.html_content,
            prompt=page.prompt,
            step1_output=page.step1_output,
            file_size=page.file_size,
            is_saved=True,
        )
        db.add(draft)
        await db.commit()
        return {"ok": True, "page_id": str(draft_id), "derived": True}

    # 草稿 → 原地更新
    if req.title is not None:
        page.title = req.title
    page.is_saved = True
    await db.commit()
    return {"ok": True, "page_id": str(page.id), "derived": False}


@router.delete("/{pk}")
async def delete_page(
    pk: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(Page.id == int(pk), Page.user_id == user.id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    # Clean up snapshot cover file (soft-delete the record)
    if page.cover_url:
        remove_snapshot_file(page.cover_url)
    page.cover_url = None

    page.status = "deleted"
    await db.commit()
    return {"ok": True}


@router.get("/{pk}/render", response_class=HTMLResponse)
async def render_page(
    pk: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Internal render endpoint — returns full page HTML for snapshot capture.

    Auth-protected (owner only) so draft pages without a public URL can still
    be rendered by the headless Chrome snapshot service.
    """
    result = await db.execute(select(Page).where(Page.id == int(pk), Page.user_id == user.id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return HTMLResponse(content=page.html_content, status_code=200)


# ── Public routes ──


@public_router.get("/{user_id}")
async def serve_user_profile(
    user_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Serve a user's public profile — list of published pages."""
    result = await db.execute(
        select(User).where(func.lower(User.user_id) == user_id.lower())
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    pages_result = await db.execute(
        select(Page)
        .where(Page.user_id == user.id, Page.is_published == True, Page.status == "active")
        .order_by(Page.updated_at.desc())
    )
    pages = pages_result.scalars().all()

    # Simple HTML profile page for now; can be enhanced later
    page_links = "\n".join(
        f'<li><a href="/{user.user_id}/{p.page_id}">{p.title or p.page_id}</a></li>'
        for p in pages
    )
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{user.nickname or user.user_id}'s pages</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }}
    ul {{ list-style: none; padding: 0; }}
    li {{ margin: 0.5rem 0; }}
    a {{ color: #00a650; text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
  </style>
</head>
<body>
  <h1>{user.nickname or user.user_id}</h1>
  <p>@{user.user_id}</p>
  <h2>Published pages ({len(pages)})</h2>
  <ul>{page_links or '<li>No published pages yet.</li>'}</ul>
</body>
</html>"""
    return HTMLResponse(content=html, status_code=200)


@public_router.get("/{user_id}/{page_id}")
async def serve_page(
    user_id: str,
    page_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Serve a published HTML page at /{user_id}/{page_id} with redirect support."""
    # 1. Find the user
    result = await db.execute(
        select(User).where(func.lower(User.user_id) == user_id.lower())
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 2. Try direct match
    result = await db.execute(
        select(Page).where(
            Page.user_id == user.id,
            func.lower(Page.page_id) == page_id.lower(),
            Page.is_published == True,
            Page.status == "active",
        )
    )
    page = result.scalar_one_or_none()

    # 3. If not found, try redirect table
    if not page:
        redirect_result = await db.execute(
            select(PageIdRedirect, Page).join(Page, PageIdRedirect.page_fk == Page.id).where(
                Page.user_id == user.id,
                func.lower(PageIdRedirect.old_page_id) == page_id.lower(),
            )
        )
        row = redirect_result.first()
        if row:
            redirect, page = row
            return RedirectResponse(
                url=f"/{user.user_id}/{page.page_id}",
                status_code=301,
            )

    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    return HTMLResponse(content=page.html_content, status_code=200)


# ── Public user profile API ──


@users_router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: str,
    viewer: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user public profile and pages. Viewer (self) sees drafts too."""
    result = await db.execute(
        select(User).where(func.lower(User.user_id) == user_id.lower())
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    is_self = viewer is not None and viewer.id == user.id
    where = or_(
        Page.is_published == True,
        Page.is_saved == True,
    ) if is_self else (Page.is_published == True)

    pages_result = await db.execute(
        select(Page)
        .where(Page.user_id == user.id, Page.status == "active", where)
        .order_by(Page.updated_at.desc())
    )
    pages = pages_result.scalars().all()

    return UserProfileResponse(
        user=UserPublicResponse(
            nickname=user.nickname,
            avatar_url=user.avatar_url,
            bio=user.bio,
            user_id=user.user_id,
        ),
        pages=[PageListItem(
            id=str(p.id),
            page_id=p.page_id,
            title=p.title,
            cover_url=p.cover_url,
            is_published=p.is_published,
            is_saved=p.is_saved,
            visibility=p.visibility,
            status=p.status,
            created_at=p.created_at,
            updated_at=p.updated_at,
        ) for p in pages],
    )
