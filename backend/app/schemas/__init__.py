import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


# ── Auth ──

class RegisterRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, pattern=r"^\d{11}$")
    password: str = Field(..., min_length=6, max_length=128)
    nickname: Optional[str] = None


class LoginRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    phone: str
    nickname: Optional[str]
    user_type: str
    token_balance: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Generate ──

class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    page_id: Optional[int] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class RefineRequest(BaseModel):
    page_id: int
    refine_prompt: str = Field(..., min_length=1, max_length=4000)
    model: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None


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
    short_code: Optional[str]
    title: Optional[str]
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
    short_code: Optional[str]
    title: Optional[str]
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
    short_code: str
    url: str

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v: Any) -> str:
        return str(v)


class SaveDraftRequest(BaseModel):
    title: Optional[str] = None


class PublishRequest(BaseModel):
    title: Optional[str] = None


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


# ── Proxy ──

class ProxyRequest(BaseModel):
    url: str = Field(..., min_length=1)
    method: str = "GET"
    headers: Optional[dict] = None
    body: Optional[dict] = None
