"""
Authentication Service — Password hashing, JWT creation, and user verification.

Uses:
  - passlib (bcrypt) for password hashing
  - python-jose for JWT token creation/verification
  - MongoDB (motor) for user storage
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.database import get_database

import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Password hashing (using bcrypt directly — passlib has compatibility issues
# with bcrypt >= 5.0)
# ---------------------------------------------------------------------------
import bcrypt as _bcrypt

# Bearer token extraction
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt."""
    salt = _bcrypt.gensalt()
    hashed = _bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    return _bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8'),
    )


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(user_id: str, email: str) -> str:
    """
    Create a signed JWT access token.

    Payload includes:
      - sub: user_id (str version of MongoDB ObjectId)
      - email: user email
      - exp: expiration timestamp
      - iat: issued-at timestamp
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=settings.JWT_EXPIRY_HOURS)

    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": now,
    }

    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return token


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token. Returns payload dict or None."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# FastAPI dependency — get current authenticated user
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency that:
      1. Extracts the Bearer token from the Authorization header
      2. Decodes and validates the JWT
      3. Looks up the user in MongoDB
      4. Returns the user document (without password hash)

    Raises 401 if token is invalid/expired or user not found.
    """
    token = credentials.credentials

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Look up user in MongoDB
    try:
        from bson import ObjectId

        database = await get_database()
        user = await database.users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        # Return user dict without password hash
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "farm_name": user.get("farm_name"),
            "created_at": user.get("created_at", "").isoformat()
            if hasattr(user.get("created_at", ""), "isoformat")
            else str(user.get("created_at", "")),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth lookup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )
