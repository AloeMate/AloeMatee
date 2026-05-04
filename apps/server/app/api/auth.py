"""
Authentication API Router — Register, Login, Get Current User.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status, Depends
import logging

from app.auth_schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
)
from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.database import get_database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(request: UserRegisterRequest):
    """
    Create a new user account.

    - Checks for duplicate email
    - Hashes password with bcrypt
    - Stores user in MongoDB `users` collection
    - Returns JWT access token + user info
    """
    try:
        database = await get_database()
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not available. Please try again later.",
        )

    # Check if email already exists
    existing_user = await database.users.find_one(
        {"email": request.email.lower().strip()}
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Create user document
    now = datetime.now(timezone.utc)
    user_doc = {
        "email": request.email.lower().strip(),
        "password_hash": hash_password(request.password),
        "full_name": request.full_name.strip(),
        "farm_name": request.farm_name.strip() if request.farm_name else None,
        "created_at": now,
        "updated_at": now,
    }

    result = await database.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    logger.info(f"✅ New user registered: {request.email}")

    # Generate JWT
    token = create_access_token(user_id, user_doc["email"])

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            email=user_doc["email"],
            full_name=user_doc["full_name"],
            farm_name=user_doc["farm_name"],
            created_at=now.isoformat(),
        ),
    )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email and password",
)
async def login(request: UserLoginRequest):
    """
    Authenticate a user with email + password.

    - Looks up user by email
    - Verifies password with bcrypt
    - Returns JWT access token + user info
    """
    try:
        database = await get_database()
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not available. Please try again later.",
        )

    # Find user
    user = await database.users.find_one(
        {"email": request.email.lower().strip()}
    )

    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user_id = str(user["_id"])
    logger.info(f"✅ User logged in: {request.email}")

    # Generate JWT
    token = create_access_token(user_id, user["email"])

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            email=user["email"],
            full_name=user.get("full_name", ""),
            farm_name=user.get("farm_name"),
            created_at=user.get("created_at", "").isoformat()
            if hasattr(user.get("created_at", ""), "isoformat")
            else str(user.get("created_at", "")),
        ),
    )


# ---------------------------------------------------------------------------
# GET /api/v1/auth/me
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile.
    Requires a valid Bearer token in the Authorization header.
    """
    return UserResponse(**current_user)
