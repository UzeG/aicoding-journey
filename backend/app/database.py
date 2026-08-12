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
    # Check if original_prompt column still exists
    result = conn.execute(
        text("PRAGMA table_info('pages')")
    )
    columns = {row[1] for row in result.fetchall()}
    if "original_prompt" in columns:
        logger.info("Migrating: original_prompt → prompt")
        conn.execute(text("ALTER TABLE pages RENAME COLUMN original_prompt TO prompt"))
    if "step1_output" not in columns:
        logger.info("Migrating: adding step1_output column to pages")
        conn.execute(text("ALTER TABLE pages ADD COLUMN step1_output TEXT"))


async def init_db():
    """Create all tables (for MVP, use in lifespan; production should use Alembic)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_run_migration_sync)
