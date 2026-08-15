from fastapi import APIRouter, Depends, Query
from sqlalchemy import exists, func, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models import Page, PageFavorite, PageLike, User
from app.schemas import (
    GalleryAuthor,
    GalleryItem,
    GalleryResponse,
    TagCount,
    normalize_tags,
)

router = APIRouter()

_PAGE_SIZE_MAX = 100


def _escape_like(s: str) -> str:
    """Escape LIKE wildcards so user search input is matched literally."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=GalleryResponse)
async def get_gallery(
    tag: str = Query("", max_length=20),
    q: str = Query("", max_length=100),
    sort: str = Query("latest", max_length=10),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=_PAGE_SIZE_MAX),
    db: AsyncSession = Depends(get_db),
):
    """Public gallery: browse all published pages, filter by tag / search, sort by newest or most liked.

    Read-only aggregation over pages + interaction counts. Never exposes html_content.
    """
    sort = sort if sort in ("latest", "hot") else "latest"

    conds = [
        Page.is_published == True,
        Page.status == "active",
        Page.visibility == "public",
    ]
    if tag:
        # 精确匹配 tags JSON 数组元素（json_each 是 SQLite 内置 JSON1 表函数）
        je = func.json_each(Page.tags).table_valued("value")
        conds.append(exists(select(1).select_from(je).where(je.c.value == tag)))
    if q:
        conds.append(Page.title.ilike(f"%{_escape_like(q)}%", escape="\\"))

    like_count_sq = (
        select(func.count()).select_from(PageLike).where(PageLike.page_fk == Page.id).scalar_subquery()
    )
    favorite_count_sq = (
        select(func.count()).select_from(PageFavorite).where(PageFavorite.page_fk == Page.id).scalar_subquery()
    )

    base = (
        select(Page, User, like_count_sq.label("like_count"), favorite_count_sq.label("favorite_count"))
        .join(User, User.id == Page.user_id)
        .where(*conds)
    )

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    order_by = [Page.created_at.desc()]
    if sort == "hot":
        order_by = [like_count_sq.desc(), Page.created_at.desc()]

    rows = (
        await db.execute(
            base.order_by(*order_by).offset((page - 1) * page_size).limit(page_size)
        )
    ).all()

    items = [
        GalleryItem(
            id=str(p.id),
            page_id=p.page_id or "",
            title=p.title,
            cover_url=p.cover_url,
            tags=normalize_tags(p.tags) or [],
            url=f"/{u.user_id}/{p.page_id}",
            created_at=p.created_at,
            like_count=like_count,
            favorite_count=favorite_count,
            author=GalleryAuthor(user_id=u.user_id or "", nickname=u.nickname, avatar_url=u.avatar_url),
        )
        for p, u, like_count, favorite_count in rows
    ]

    # 聚合所有已发布页面的 tags 计数（供前端 tag 筛选条展示）
    je = func.json_each(Page.tags).table_valued("value")
    tag_rows = (
        await db.execute(
            select(je.c.value.label("tag"), func.count().label("cnt"))
            .select_from(Page)
            .join(je, true())
            .where(
                Page.is_published == True,
                Page.status == "active",
                Page.visibility == "public",
            )
            .group_by(je.c.value)
            .order_by(func.count().desc())
            .limit(50)
        )
    ).all()
    tag_counts = [TagCount(tag=r.tag, count=r.cnt) for r in tag_rows]

    return GalleryResponse(items=items, total=total, page=page, page_size=page_size, tag_counts=tag_counts)
