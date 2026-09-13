"""Auth router — register / login / me. Pattern from ResolveAI user_routes."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import User
from app.schemas.auth_schemas import Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

VALID_ROLES = {"STUDENT", "TECHNICIAN", "ADMIN"}


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=422, detail=f"role must be one of {sorted(VALID_ROLES)}")
    existing = db.execute(select(User).where(User.email == data.email.lower())).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
        department=data.department,
    )
    db.add(user)
    db.flush()
    token = create_access_token(str(user.id), user.role)
    return Token(access_token=token, token_type="bearer", role=user.role, full_name=user.full_name)


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == data.email.lower())).scalar_one_or_none()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated.")
    token = create_access_token(str(user.id), user.role)
    return Token(access_token=token, token_type="bearer", role=user.role, full_name=user.full_name)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        avatar_url=user.avatar_url,
    )
