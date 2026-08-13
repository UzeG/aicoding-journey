import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


# ── Auth ──

class RegisterRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, pattern=r"^\d{11}$")
    password: str = Field(..., min_length=6, max_length=128)
    nickname: Optional[str] = None
    user_id: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_-]{3,30}$")


class LoginRequest(BaseModel):
    account: str = Field(..., min_length=1, max_length=128)  # phone or user_id
    password: str = Field(..., min_length=1)


class CheckUserIdResponse(BaseModel):
    available: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    phone: str
    nickname: Optional[str]
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    user_type: str
    user_id: Optional[str] = None
    token_balance: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    nickname: Optional[str] = Field(default=None, min_length=1, max_length=50)
    bio: Optional[str] = Field(default=None, max_length=160)


# ── Generate ──

class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    page_id: Optional[int] = None



# ── Pages ──

class PageCreate(BaseModel):
    title: Optional[str] = None
    html_content: str = ""
    prompt: Optional[str] = None


class PageUpdate(BaseModel):
    title: Optional[str] = None
    html_content: Optional[str] = None


class PageResponse(BaseModel):
    id: str
    page_id: Optional[str]
    title: Optional[str]
    cover_url: Optional[str] = None
    html_content: str = ""
    prompt: Optional[str]
    file_size: Optional[int]
    is_published: bool
    is_saved: bool
    visibility: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v: Any) -> str:
        return str(v)


class PageListItem(BaseModel):
    id: str
    page_id: Optional[str]
    title: Optional[str]
    cover_url: Optional[str] = None
    is_published: bool
    is_saved: bool
    visibility: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v: Any) -> str:
        return str(v)


class PublishResponse(BaseModel):
    id: str
    page_id: str
    url: str

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v: Any) -> str:
        return str(v)


class SaveDraftRequest(BaseModel):
    title: Optional[str] = None


class PublishRequest(BaseModel):
    title: Optional[str] = None
    page_id: Optional[str] = Field(default=None, max_length=50)


class UpdatePageIdRequest(BaseModel):
    page_id: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-zA-Z0-9_-]{1,50}$")


class CheckPageIdResponse(BaseModel):
    available: bool


# ── Prompts ──

class PromptResponse(BaseModel):
    id: int
    prompt: str

    model_config = {"from_attributes": True}


# ── Settings ──

class LLMSettingsResponse(BaseModel):
    model: Optional[str] = None
    base_url: Optional[str] = None
    has_api_key: bool = False


class LLMSettingsUpdate(BaseModel):
    model: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None


# ── User Profile (public) ──

class UserPublicResponse(BaseModel):
    nickname: Optional[str]
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    user_id: Optional[str] = None


class UserProfileResponse(BaseModel):
    user: UserPublicResponse
    pages: list[PageListItem]


# ── Proxy ──

class ProxyRequest(BaseModel):
    url: str = Field(..., min_length=1)
    method: str = "GET"
    headers: Optional[dict] = None
    body: Optional[dict] = None
