from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models import User
from app.schemas import LLMSettingsResponse, LLMSettingsUpdate
from app.services.llm_service import decrypt_api_key, encrypt_api_key

router = APIRouter()


@router.get("/llm", response_model=LLMSettingsResponse)
async def get_llm_settings(
    user: User = Depends(get_current_user),
):
    return LLMSettingsResponse(
        model=user.llm_model,
        base_url=user.llm_base_url,
        has_api_key=bool(user.llm_api_key),
    )


@router.put("/llm", response_model=LLMSettingsResponse)
async def update_llm_settings(
    req: LLMSettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.model is not None:
        user.llm_model = req.model
    if req.base_url is not None:
        user.llm_base_url = req.base_url
    if req.api_key is not None:
        if req.api_key:
            user.llm_api_key = encrypt_api_key(req.api_key)
        else:
            user.llm_api_key = None

    await db.commit()
    await db.refresh(user)

    return LLMSettingsResponse(
        model=user.llm_model,
        base_url=user.llm_base_url,
        has_api_key=bool(user.llm_api_key),
    )
