"""Auth schemas — ported structure from ResolveAI auth_schemas.py."""
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field

EmailValue = Annotated[str, Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]


class UserCreate(BaseModel):
    email: EmailValue
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=2, max_length=255)
    role: str = "STUDENT"
    department: str | None = None

    model_config = {"extra": "forbid"}


class UserLogin(BaseModel):
    email: EmailValue
    password: str

    model_config = {"extra": "forbid"}


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    department: str | None
    avatar_url: str | None

    model_config = {"from_attributes": True}
