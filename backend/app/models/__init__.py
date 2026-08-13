import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, func
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


class PageIdRedirect(Base):
    __tablename__ = "page_id_redirects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    page_fk: Mapped[int] = mapped_column(BigInteger, ForeignKey("pages.id"), nullable=False)
    old_page_id: Mapped[str] = mapped_column(String(50), nullable=False)
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
