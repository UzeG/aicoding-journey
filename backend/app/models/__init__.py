import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone: Mapped[str] = mapped_column(String(11), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[str | None] = mapped_column(String(50), default=None)
    avatar_url: Mapped[str | None] = mapped_column(String(255), default=None)
    bio: Mapped[str | None] = mapped_column(String(160), default=None)
    readme: Mapped[str | None] = mapped_column(Text, default=None)
    theme: Mapped[str | None] = mapped_column(String(7), default=None)
    appearance: Mapped[str | None] = mapped_column(String(10), default=None)  # light / dark / system
    user_type: Mapped[str] = mapped_column(String(20), default="registered")
    user_id: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True, index=True)

    llm_model: Mapped[str | None] = mapped_column(String(100), default=None)
    llm_api_key: Mapped[str | None] = mapped_column(String(512), default=None)
    llm_base_url: Mapped[str | None] = mapped_column(String(255), default=None)

    token_balance: Mapped[int] = mapped_column(Integer, default=500)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    pages = relationship("Page", back_populates="user")


class Page(Base):
    __tablename__ = "pages"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    page_id: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    title: Mapped[str | None] = mapped_column(String(200), default=None)
    cover_url: Mapped[str | None] = mapped_column(String(255), default=None)
    html_content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    prompt: Mapped[str | None] = mapped_column(Text, default=None)
    step1_output: Mapped[str | None] = mapped_column(Text, default=None)
    file_size: Mapped[int | None] = mapped_column(Integer, default=None)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_saved: Mapped[bool] = mapped_column(Boolean, default=False)
    visibility: Mapped[str] = mapped_column(String(20), default="public")
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="pages")


class PageLike(Base):
    """A user liked a published page."""

    __tablename__ = "page_likes"
    __table_args__ = (UniqueConstraint("page_fk", "user_fk", name="uq_page_like"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    page_fk: Mapped[int] = mapped_column(BigInteger, ForeignKey("pages.id"), nullable=False, index=True)
    user_fk: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class PageComment(Base):
    """A comment on a published page."""

    __tablename__ = "page_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    page_fk: Mapped[int] = mapped_column(BigInteger, ForeignKey("pages.id"), nullable=False, index=True)
    user_fk: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class PageFavorite(Base):
    """A user favorited a published page."""

    __tablename__ = "page_favorites"
    __table_args__ = (UniqueConstraint("page_fk", "user_fk", name="uq_page_favorite"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    page_fk: Mapped[int] = mapped_column(BigInteger, ForeignKey("pages.id"), nullable=False, index=True)
    user_fk: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class PageIdRedirect(Base):
    __tablename__ = "page_id_redirects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    page_fk: Mapped[int] = mapped_column(BigInteger, ForeignKey("pages.id"), nullable=False)
    old_page_id: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Follow(Base):
    """User follows user (GitHub-style). follower_id follows following_id."""

    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "following_id", name="uq_follow_pair"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    follower_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    following_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class RecommendedPrompt(Base):
    __tablename__ = "recommended_prompts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, default=None)
    result: Mapped[str | None] = mapped_column(String(20), default=None)
    client_ip: Mapped[str | None] = mapped_column(String(45), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class GenerationTrace(Base):
    """Per-generation record of LLM intermediate outputs (Step1 JSON, Step2 raw stream).

    Written for every real generation (`source="generation"`) and admin test run
    (`source="test"`). `page_fk` intentionally has no FK constraint to avoid coupling
    with soft-deleted pages.
    """

    __tablename__ = "generation_traces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    page_fk: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="generation")  # generation | test
    strategy: Mapped[str] = mapped_column(String(20), default="two_step")  # two_step | single_step
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    refined_prompt: Mapped[str | None] = mapped_column(Text, default=None)
    libraries: Mapped[str | None] = mapped_column(Text, default=None)  # JSON array string
    step1_output: Mapped[str | None] = mapped_column(Text, default=None)  # Step1 raw JSON string
    step2_raw: Mapped[str | None] = mapped_column(Text, default=None)  # full stream before HTML filter
    final_html: Mapped[str | None] = mapped_column(Text, default=None)
    tokens_used: Mapped[int | None] = mapped_column(Integer, default=None)
    model: Mapped[str | None] = mapped_column(String(100), default=None)
    base_url: Mapped[str | None] = mapped_column(String(255), default=None)
    config_source: Mapped[str | None] = mapped_column(String(20), default=None)  # platform | user
    status: Mapped[str] = mapped_column(String(20), default="success")  # success | error
    error_message: Mapped[str | None] = mapped_column(Text, default=None)
    duration_ms: Mapped[int | None] = mapped_column(Integer, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
