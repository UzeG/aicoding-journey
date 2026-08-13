import uuid
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.utils import decode_access_token

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate JWT, return current User. Raises 401 if invalid."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user_id_str = decode_access_token(credentials.credentials)
    if user_id_str is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    result = await db.execute(select(User).where(User.id == user_id_str))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def is_admin_user(user: User) -> bool:
    """True if the user is listed in ADMIN_USER_IDS (phone or user_id, case-insensitive)."""
    from app.config import settings

    admins = {s.strip().lower() for s in settings.ADMIN_USER_IDS.split(",") if s.strip()}
    if not admins:
        return False
    if user.phone in admins:
        return True
    if user.user_id and user.user_id.lower() in admins:
        return True
    return False


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """Like get_current_user but requires admin privileges (403 otherwise)."""
    if not is_admin_user(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Resolve current User from JWT if present; returns None if absent/invalid."""
    if credentials is None:
        return None
    user_id_str = decode_access_token(credentials.credentials)
    if user_id_str is None:
        return None
    result = await db.execute(select(User).where(User.id == user_id_str))
    return result.scalar_one_or_none()


async def get_client_ip(request: Request) -> str:
    """Extract client IP from request headers or direct client."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
