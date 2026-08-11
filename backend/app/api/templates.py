from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models import Template
from app.schemas import TemplateResponse

router = APIRouter()


@router.get("", response_model=list[TemplateResponse])
async def list_templates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Template).where(Template.is_active == True).order_by(Template.sort_order)
    )
    return result.scalars().all()
