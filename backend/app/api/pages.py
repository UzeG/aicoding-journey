import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_optional_user
from app.config import settings
from app.models import (
    AuditLog,
    Follow,
    Page,
    PageComment,
    PageFavorite,
    PageIdRedirect,
    PageLike,
    User,
)
from app.schemas import (
    ActivityDay,
    ActivityResponse,
    CheckPageIdResponse,
    CommentCreate,
    CommentItem,
    CommentUser,
    FollowResponse,
    FollowUserItem,
    InteractionPageInfo,
    InteractionResponse,
    InteractionViewer,
    PageListItem,
    PageResponse,
    PageUpdate,
    PublishRequest,
    PublishResponse,
    SaveDraftRequest,
    ToggleResponse,
    UpdatePageIdRequest,
    UserProfileResponse,
    UserPublicResponse,
)
from app.services.page_id import generate_page_id, validate_page_id_format
from app.services.publish_scanner import scan_html
from app.services.sdk_injector import inject_sdk
from app.services.snapshot import remove_snapshot_file

logger = logging.getLogger(__name__)

router = APIRouter()
public_router = APIRouter()
users_router = APIRouter()

_MAX_UPLOAD_HTML_BYTES = 5 * 1024 * 1024  # 5MB
_UPLOAD_EXTS = {".html", ".htm"}


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


@router.post("/upload", response_model=PageResponse)
async def upload_page(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import a standalone .html/.htm file as a draft page (is_saved=True).

    Content is stored directly in pages.html_content (text, not a static file).
    Safety is gated by the existing publish-time scan_html; drafts stay private.
    """
    name = file.filename or ""
    if os.path.splitext(name)[1].lower() not in _UPLOAD_EXTS:
        raise HTTPException(status_code=400, detail="Only a single .html or .htm file is supported")

    content = await file.read(_MAX_UPLOAD_HTML_BYTES + 1)
    if len(content) > _MAX_UPLOAD_HTML_BYTES:
        raise HTTPException(status_code=413, detail="HTML file too large (max 5MB)")

    html = content.decode("utf-8", errors="replace").strip()
    head = html[:1024].lower()
    if not (head.startswith("<!doctype html") or "<html" in head):
        raise HTTPException(status_code=400, detail="File does not look like an HTML document")

    from app.utils.snowflake import generate_id

    title = os.path.splitext(os.path.basename(name))[0][:200] or None
    page = Page(
        id=generate_id(),
        user_id=user.id,
        title=title,
        html_content=html,
        file_size=len(html.encode("utf-8")),
        is_saved=True,
    )
    db.add(page)
    await db.commit()
    await db.refresh(page)

    # Async cover snapshot — same chain as generated pages, failures degrade gracefully
    try:
        from app.services.snapshot import capture_snapshot

        asyncio.get_running_loop().create_task(capture_snapshot(page.id, user.id))
    except Exception:
        logger.warning("Failed to schedule snapshot for uploaded page", exc_info=True)

    return page


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


# ── Page interactions (likes / comments / favorites) ──


async def _resolve_page(db: AsyncSession, pk: str) -> Page:
    result = await db.execute(select(Page).where(Page.id == int(pk)))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


@router.get("/{pk}/interactions", response_model=InteractionResponse)
async def get_page_interactions(
    pk: str,
    viewer: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Public read: like/favorite counts + comments + (if logged in) viewer state."""
    page = await _resolve_page(db, pk)

    like_count = await db.scalar(
        select(func.count()).select_from(PageLike).where(PageLike.page_fk == page.id)
    ) or 0
    favorite_count = await db.scalar(
        select(func.count()).select_from(PageFavorite).where(PageFavorite.page_fk == page.id)
    ) or 0

    comments_result = await db.execute(
        select(PageComment, User)
        .join(User, PageComment.user_fk == User.id)
        .where(PageComment.page_fk == page.id)
        .order_by(PageComment.created_at.desc())
    )
    comments = [
        CommentItem(
            id=c.id,
            content=c.content,
            created_at=c.created_at,
            user=CommentUser(user_id=u.user_id or "", nickname=u.nickname, avatar_url=u.avatar_url),
            is_mine=(viewer is not None and u.id == viewer.id),
        )
        for c, u in comments_result.all()
    ]

    viewer_state = None
    if viewer is not None:
        liked = await db.scalar(
            select(func.count()).select_from(PageLike).where(
                PageLike.page_fk == page.id, PageLike.user_fk == viewer.id
            )
        ) or 0
        favorited = await db.scalar(
            select(func.count()).select_from(PageFavorite).where(
                PageFavorite.page_fk == page.id, PageFavorite.user_fk == viewer.id
            )
        ) or 0
        viewer_state = InteractionViewer(liked=liked > 0, favorited=favorited > 0)

    owner = await db.get(User, page.user_id)
    page_info = InteractionPageInfo(
        title=page.title,
        page_id=page.page_id,
        author=CommentUser(
            user_id=owner.user_id if owner else "",
            nickname=owner.nickname if owner else None,
            avatar_url=owner.avatar_url if owner else None,
        ),
    )

    return InteractionResponse(
        like_count=like_count,
        favorite_count=favorite_count,
        comments=comments,
        viewer=viewer_state,
        page=page_info,
    )


@router.post("/{pk}/like", response_model=ToggleResponse)
async def toggle_page_like(
    pk: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _resolve_page(db, pk)
    result = await db.execute(
        select(PageLike).where(PageLike.page_fk == page.id, PageLike.user_fk == user.id)
    )
    rel = result.scalar_one_or_none()
    if rel is not None:
        await db.delete(rel)
        state = False
    else:
        db.add(PageLike(page_fk=page.id, user_fk=user.id))
        state = True
    await db.commit()

    count = await db.scalar(
        select(func.count()).select_from(PageLike).where(PageLike.page_fk == page.id)
    ) or 0
    return ToggleResponse(state=state, count=count)


@router.post("/{pk}/favorite", response_model=ToggleResponse)
async def toggle_page_favorite(
    pk: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _resolve_page(db, pk)
    result = await db.execute(
        select(PageFavorite).where(PageFavorite.page_fk == page.id, PageFavorite.user_fk == user.id)
    )
    rel = result.scalar_one_or_none()
    if rel is not None:
        await db.delete(rel)
        state = False
    else:
        db.add(PageFavorite(page_fk=page.id, user_fk=user.id))
        state = True
    await db.commit()

    count = await db.scalar(
        select(func.count()).select_from(PageFavorite).where(PageFavorite.page_fk == page.id)
    ) or 0
    return ToggleResponse(state=state, count=count)


@router.post("/{pk}/comments", response_model=CommentItem)
async def add_page_comment(
    pk: str,
    req: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _resolve_page(db, pk)
    comment = PageComment(page_fk=page.id, user_fk=user.id, content=req.content.strip())
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommentItem(
        id=comment.id,
        content=comment.content,
        created_at=comment.created_at,
        user=CommentUser(user_id=user.user_id or "", nickname=user.nickname, avatar_url=user.avatar_url),
    )


@router.delete("/{pk}/comments/{cid}")
async def delete_page_comment(
    pk: str,
    cid: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _resolve_page(db, pk)
    result = await db.execute(
        select(PageComment).where(
            PageComment.id == cid,
            PageComment.page_fk == page.id,
            PageComment.user_fk == user.id,
        )
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    await db.delete(comment)
    await db.commit()
    return {"ok": True}


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


def build_interaction_widget(page_pk: str) -> str:
    """HTML fragment injected into served published pages (not stored / not snapshotted)."""
    return (
        f'<div id="platform-interactions" data-pk="{page_pk}"></div>\n'
        '<script src="/static/interactions.js" defer></script>'
    )


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

    # 服务期注入互动组件（点赞/评论/收藏）——不改动存储的 html_content
    widget = build_interaction_widget(str(page.id))
    html = page.html_content
    if "</body>" in html:
        html = html.replace("</body>", widget + "\n</body>")
    else:
        html = html + "\n" + widget

    return HTMLResponse(content=html, status_code=200)


# ── Public user profile API ──


async def _resolve_user(db: AsyncSession, user_id: str) -> User:
    result = await db.execute(select(User).where(func.lower(User.user_id) == user_id.lower()))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def _build_follow_items(
    db: AsyncSession,
    rows: list[tuple[Follow, User]],
    viewer: Optional[User],
) -> list[FollowUserItem]:
    """Rows are (Follow, User) pairs from a joined followers/following query."""
    items = [
        FollowUserItem(
            id=u.id,
            user_id=u.user_id or "",
            nickname=u.nickname,
            avatar_url=u.avatar_url,
            bio=u.bio,
        )
        for _, u in rows
    ]
    if viewer and items:
        followed_ids = [it.id for it in items]
        res = await db.execute(
            select(Follow.following_id).where(
                Follow.follower_id == viewer.id,
                Follow.following_id.in_(followed_ids),
            )
        )
        following_set = set(res.scalars().all())
        for it in items:
            it.is_following = it.id in following_set
    return items


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

    follower_count = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.following_id == user.id)
    ) or 0
    following_count = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.follower_id == user.id)
    ) or 0

    is_following = False
    if viewer is not None and viewer.id != user.id:
        rel = await db.execute(
            select(Follow).where(Follow.follower_id == viewer.id, Follow.following_id == user.id)
        )
        is_following = rel.scalar_one_or_none() is not None

    return UserProfileResponse(
        user=UserPublicResponse(
            nickname=user.nickname,
            avatar_url=user.avatar_url,
            bio=user.bio,
            readme=user.readme,
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
        follower_count=follower_count,
        following_count=following_count,
        is_following=is_following,
    )


@users_router.post("/{user_id}/follow", response_model=FollowResponse)
async def follow_user(
    user_id: str,
    viewer: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _resolve_user(db, user_id)
    if target.id == viewer.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")

    existing = await db.execute(
        select(Follow).where(Follow.follower_id == viewer.id, Follow.following_id == target.id)
    )
    if existing.scalar_one_or_none() is None:
        db.add(Follow(follower_id=viewer.id, following_id=target.id))
        await db.commit()

    count = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.following_id == target.id)
    )
    return FollowResponse(ok=True, is_following=True, follower_count=count or 0)


@users_router.delete("/{user_id}/follow", response_model=FollowResponse)
async def unfollow_user(
    user_id: str,
    viewer: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _resolve_user(db, user_id)
    result = await db.execute(
        select(Follow).where(Follow.follower_id == viewer.id, Follow.following_id == target.id)
    )
    rel = result.scalar_one_or_none()
    if rel is not None:
        await db.delete(rel)
        await db.commit()

    count = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.following_id == target.id)
    )
    return FollowResponse(ok=True, is_following=False, follower_count=count or 0)


@users_router.get("/{user_id}/followers", response_model=list[FollowUserItem])
async def list_followers(
    user_id: str,
    viewer: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _resolve_user(db, user_id)
    result = await db.execute(
        select(Follow, User)
        .join(User, Follow.follower_id == User.id)
        .where(Follow.following_id == target.id)
        .order_by(Follow.created_at.desc())
    )
    return await _build_follow_items(db, result.all(), viewer)


@users_router.get("/{user_id}/following", response_model=list[FollowUserItem])
async def list_following(
    user_id: str,
    viewer: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _resolve_user(db, user_id)
    result = await db.execute(
        select(Follow, User)
        .join(User, Follow.following_id == User.id)
        .where(Follow.follower_id == target.id)
        .order_by(Follow.created_at.desc())
    )
    return await _build_follow_items(db, result.all(), viewer)


@users_router.get("/{user_id}/activity", response_model=ActivityResponse)
async def get_user_activity(
    user_id: str,
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
):
    """Per-day page-creation counts for a calendar year (contribution-graph style).

    Defaults to the most recent year with any activity. `years` lists every year that
    has activity so the frontend can render the GitHub-style year selector.
    """
    target = await _resolve_user(db, user_id)

    years_result = await db.execute(
        select(func.strftime("%Y", Page.created_at).label("y"))
        .where(Page.user_id == target.id, Page.status == "active")
        .distinct()
        .order_by(func.strftime("%Y", Page.created_at).desc())
    )
    years = [int(r.y) for r in years_result.all()]
    if not years:
        years = [datetime.utcnow().year]

    now = datetime.utcnow()
    if year is None:
        year = years[0]
    year = min(year, now.year)

    start = datetime(year, 1, 1)
    if year == now.year:
        end_exclusive = now.date() + timedelta(days=1)  # 到今天为止
    else:
        end_exclusive = datetime(year + 1, 1, 1).date()

    result = await db.execute(
        select(
            func.strftime("%Y-%m-%d", Page.created_at).label("day"),
            func.count().label("cnt"),
        )
        .where(
            Page.user_id == target.id,
            Page.status == "active",
            Page.created_at >= start,
            Page.created_at < end_exclusive,
        )
        .group_by("day")
    )
    counts = {row.day: row.cnt for row in result.all()}

    day_count = (end_exclusive - start.date()).days
    return ActivityResponse(
        year=year,
        years=years,
        days=[
            ActivityDay(
                date=(start.date() + timedelta(days=i)).isoformat(),
                count=counts.get((start.date() + timedelta(days=i)).isoformat(), 0),
            )
            for i in range(day_count)
        ],
    )
