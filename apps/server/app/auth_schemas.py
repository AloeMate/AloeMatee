"""
Pydantic schemas for authentication endpoints.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional


class UserRegisterRequest(BaseModel):
    """Request body for user registration."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    full_name: str = Field(..., min_length=1, description="User full name")
    farm_name: Optional[str] = Field(None, description="Optional farm name")


class UserLoginRequest(BaseModel):
    """Request body for user login."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class UserResponse(BaseModel):
    """User data returned in API responses (no password)."""
    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    full_name: str = Field(..., description="User full name")
    farm_name: Optional[str] = Field(None, description="Farm name")
    created_at: str = Field(..., description="Account creation timestamp")


class TokenResponse(BaseModel):
    """Response returned after successful login/register."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserResponse = Field(..., description="Authenticated user info")
