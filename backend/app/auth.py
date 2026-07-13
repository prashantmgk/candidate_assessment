import os
from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr

from . import db

SECRET_KEY = os.environ.get("JWT_SECRET", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


class CurrentUser(BaseModel):
    email: EmailStr
    role: Literal["reviewer", "admin"]


# pw hashing

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# registration & login

def register_user(email: str, password: str) -> dict:
    """Role is hardcoded to 'reviewer' right here - schemas.UserRegister has
    no role field at all, so there's nothing upstream a client could send
    to override this."""
    if db.get_user_by_email(email):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "email already registered")
    return db.create_user(email=email, password_hash=hash_password(password), role="reviewer")


def authenticate_user(email: str, password: str) -> dict | None:
    user = db.get_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return user


#  JWT 

def create_access_token(email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": email, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")


#  FastAPI dependencies 

def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    payload = _decode_token(token)
    email = payload.get("sub")
    role = payload.get("role")
    if not email or role not in ("reviewer", "admin"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token payload")

    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user no longer exists")
    return CurrentUser(email=user["email"], role=user["role"])


def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "admin access required")
    return current_user