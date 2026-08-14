import uuid
from datetime import datetime
from typing import Any, Generic, Optional, TypeVar

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
    theme: Optional[str] = None
    user_type: str
    user_id: Optional[str] = None
    token_balance: int
    is_admin: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    nickname: Optional[str] = Field(default=None, min_length=1, max_length=50)
    bio: Optional[str] = Field(default=None, max_length=160)
    readme: Optional[str] = Field(default=None, max_length=20000)
    # 个人主题色：仅接受前端色卡里的 #RRGGBB
    theme: Optional[str] = Field(default=None, max_length=7, pattern=r"^#[0-9a-fA-F]{6}$")


# ── Generate ──

class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=10000)
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
    readme: Optional[str] = None
    user_id: Optional[str] = None


class UserProfileResponse(BaseModel):
    user: UserPublicResponse
    pages: list[PageListItem]
    follower_count: int = 0
    following_count: int = 0
    is_following: bool = False


# ── Follow ──

class FollowResponse(BaseModel):
    ok: bool
    is_following: bool
    follower_count: int


class FollowUserItem(BaseModel):
    id: str
    user_id: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_following: bool = False


# ── Interactions (page likes / comments / favorites) ──

class CommentUser(BaseModel):
    user_id: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None


class CommentItem(BaseModel):
    id: int
    content: str
    created_at: datetime
    user: CommentUser
    is_mine: bool = False


class InteractionViewer(BaseModel):
    liked: bool = False
    favorited: bool = False
    is_self: bool = False


class InteractionPageInfo(BaseModel):
    title: Optional[str] = None
    page_id: Optional[str] = None
    author: CommentUser


class InteractionResponse(BaseModel):
    like_count: int = 0
    favorite_count: int = 0
    comments: list[CommentItem] = []
    viewer: Optional[InteractionViewer] = None
    page: Optional[InteractionPageInfo] = None


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)


class ToggleResponse(BaseModel):
    state: bool
    count: int


# ── Activity ──

class ActivityDay(BaseModel):
    date: str
    count: int


class ActivityResponse(BaseModel):
    year: int
    days: list[ActivityDay]
    years: list[int]


# ── Proxy ──

class ProxyRequest(BaseModel):
    url: str = Field(..., min_length=1)
    method: str = "GET"
    headers: Optional[dict] = None
    body: Optional[dict] = None


# ── Admin ──

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class TestConfig(BaseModel):
    model: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None


class TestGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=10000)
    config: Optional[TestConfig] = None
    strategy: str = "two_step"  # "two_step" | "single_step"


class AdminUserListItem(BaseModel):
    id: str
    phone: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    user_id: Optional[str] = None
    token_balance: int
    is_admin: bool = False
    pages_count: int = 0
    created_at: datetime


class AdminUserDetail(AdminUserListItem):
    llm_model: Optional[str] = None
    llm_base_url: Optional[str] = None
    has_api_key: bool = False


class AdminPageListItem(BaseModel):
    id: str
    page_id: Optional[str]
    user_id: str
    user_nickname: Optional[str] = None
    title: Optional[str]
    cover_url: Optional[str] = None
    is_published: bool
    is_saved: bool
    visibility: str
    status: str
    file_size: Optional[int]
    created_at: datetime
    updated_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v: Any) -> str:
        return str(v)


class AdminPageDetail(AdminPageListItem):
    prompt: Optional[str] = None
    step1_output: Optional[str] = None
    html_content: str = ""


class AdminTraceListItem(BaseModel):
    id: str
    source: str
    strategy: str = "two_step"
    status: str
    user_id: Optional[str] = None
    page_fk: Optional[str] = None
    prompt: Optional[str] = None
    model: Optional[str] = None
    config_source: Optional[str] = None
    tokens_used: Optional[int] = None
    duration_ms: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("page_fk", mode="before")
    @classmethod
    def coerce_page_fk(cls, v: Any) -> Optional[str]:
        return str(v) if v is not None else None


class AdminTraceDetail(AdminTraceListItem):
    refined_prompt: Optional[str] = None
    libraries: Optional[str] = None
    step1_output: Optional[str] = None
    step2_raw: Optional[str] = None
    final_html: Optional[str] = None
    base_url: Optional[str] = None
    error_message: Optional[str] = None


class AdminAuditLogItem(BaseModel):
    id: str
    user_id: Optional[str] = None
    action: str
    content: Optional[str] = None
    result: Optional[str] = None
    client_ip: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminLLMConfigUser(BaseModel):
    user_id: Optional[str] = None
    nickname: Optional[str] = None
    phone: str
    model: Optional[str] = None
    base_url: Optional[str] = None
    has_api_key: bool


class AdminLLMConfigsResponse(BaseModel):
    platform: LLMSettingsResponse
    users: list[AdminLLMConfigUser]


class AdminSystemPromptsResponse(BaseModel):
    step1: str
    step2: str


class AdminStatsResponse(BaseModel):
    users_count: int
    pages_count: int
    published_pages_count: int
    traces_count: int
    success_traces: int
    error_traces: int
    audit_count: int
    users_with_llm_config: int
