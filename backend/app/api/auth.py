from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models import User
from app.schemas import CheckUserIdResponse, LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.utils import create_access_token, hash_password, verify_password
from app.utils.snowflake import generate_id

router = APIRouter()

# Reserved user_ids that cannot be registered
_RESERVED_IDS = frozenset({
    "api", "admin", "static", "p", "login", "register", "settings",
    "generate", "mock", "www", "root", "system", "null", "undefined",
})


def _normalize_user_id(raw: str) -> str:
    """Lowercase for uniqueness checks; storage preserves original casing."""
    return raw.lower()


@router.get("/check", response_model=CheckUserIdResponse)
async def check_user_id(
    user_id: str = Query(..., min_length=3, max_length=30),
    db: AsyncSession = Depends(get_db),
):
    """Check if a user_id is available (case-insensitive)."""
    norm = _normalize_user_id(user_id)

    if norm in _RESERVED_IDS:
        return CheckUserIdResponse(available=False)

    result = await db.execute(
        select(User).where(func.lower(User.user_id) == norm)
    )
    existing = result.scalar_one_or_none()
    return CheckUserIdResponse(available=existing is None)


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check phone uniqueness
    result = await db.execute(select(User).where(User.phone == req.phone))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already registered")

    # Check user_id uniqueness (case-insensitive)
    norm = _normalize_user_id(req.user_id)
    if norm in _RESERVED_IDS:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This user ID is reserved")
    result = await db.execute(
        select(User).where(func.lower(User.user_id) == norm)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User ID already taken")

    user = User(
        phone=req.phone,
        password_hash=hash_password(req.password),
        nickname=req.nickname or f"用户{req.phone[-4:]}",
        user_id=req.user_id,  # store original casing
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


async def _ensure_user_id(user: User, db: AsyncSession):
    """Backfill user_id for existing users who don't have one."""
    if user.user_id is not None:
        return
    auto_uid = f"u{generate_id():016x}"[:10]
    # Check collision (vanishingly unlikely)
    existing = await db.execute(
        select(User).where(func.lower(User.user_id) == auto_uid)
    )
    if existing.scalar_one_or_none():
        auto_uid = f"u{generate_id():016x}"[:10]  # retry once
    user.user_id = auto_uid
    await db.commit()
    await db.refresh(user)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    account = req.account.strip()

    # Try phone first, then user_id
    result = await db.execute(select(User).where(User.phone == account))
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(
            select(User).where(func.lower(User.user_id) == account.lower())
        )
        user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid account or password")

    # Backfill user_id for old users
    await _ensure_user_id(user, db)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _ensure_user_id(user, db)
    return user
