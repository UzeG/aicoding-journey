import asyncio
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


def _run_migration_sync(conn):
    """Run migrations synchronously (called via conn.run_sync)."""
    # ── pages table ──
    result = conn.execute(text("PRAGMA table_info('pages')"))
    columns = {row[1] for row in result.fetchall()}

    if "original_prompt" in columns:
        logger.info("Migrating: original_prompt → prompt")
        conn.execute(text("ALTER TABLE pages RENAME COLUMN original_prompt TO prompt"))
    if "step1_output" not in columns:
        logger.info("Migrating: adding step1_output column to pages")
        conn.execute(text("ALTER TABLE pages ADD COLUMN step1_output TEXT"))
    if "short_code" in columns:
        logger.info("Migrating: short_code → page_id")
        conn.execute(text("ALTER TABLE pages RENAME COLUMN short_code TO page_id"))

    # ── users table ──
    result = conn.execute(text("PRAGMA table_info('users')"))
    user_columns = {row[1] for row in result.fetchall()}
    if "user_id" not in user_columns:
        logger.info("Migrating: adding user_id column to users")
        conn.execute(text("ALTER TABLE users ADD COLUMN user_id TEXT"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)"))
        # Backfill user_id for existing users (e.g. demo user without user_id)
        from app.utils.snowflake import generate_id as _gen
        existing = conn.execute(
            text("SELECT id FROM users WHERE user_id IS NULL")
        ).fetchall()
        for (uid,) in existing:
            auto_uid = f"u{_gen():016x}"[:10]
            conn.execute(
                text("UPDATE users SET user_id = :uid WHERE id = :id"),
                {"uid": auto_uid, "id": uid},
            )
            logger.info(f"Backfilled user_id={auto_uid} for user {uid}")
    if "avatar_url" not in user_columns:
        logger.info("Migrating: adding avatar_url column to users")
        conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url TEXT"))
    if "bio" not in user_columns:
        logger.info("Migrating: adding bio column to users")
        conn.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))

    # ── pages: cover_url (snapshot/cover image) ──
    if "cover_url" not in columns:
        logger.info("Migrating: adding cover_url column to pages")
        conn.execute(text("ALTER TABLE pages ADD COLUMN cover_url TEXT"))

    # ── page_id_redirects table (created by Base.metadata.create_all) ──
    # Ensure composite unique index for (user_id, page_id) on pages
    conn.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_user_page ON pages(user_id, page_id) "
        "WHERE page_id IS NOT NULL"
    ))


async def init_db():
    """Create all tables (for MVP, use in lifespan; production should use Alembic)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_run_migration_sync)
