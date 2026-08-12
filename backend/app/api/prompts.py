from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models import RecommendedPrompt
from app.schemas import PromptResponse

router = APIRouter()


@router.get("", response_model=list[PromptResponse])
async def list_prompts(db: AsyncSession = Depends(get_db)):
    """Return active recommended prompts, sorted by sort_order."""
    result = await db.execute(
        select(RecommendedPrompt)
        .where(RecommendedPrompt.is_active == True)
        .order_by(RecommendedPrompt.sort_order)
    )
    return result.scalars().all()
