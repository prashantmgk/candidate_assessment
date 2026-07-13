from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

CandidateStatus = Literal["new", "reviewed", "hired", "rejected", "archived"]


# ---------------- scores ----------------

class ScoreCreate(BaseModel):
    """Request body for POST /candidates/{id}/scores."""
    category: str = Field(min_length=1, max_length=50)
    score: int = Field(ge=1, le=5)
    note: Optional[str] = Field(default=None, max_length=500)


class ScoreOut(BaseModel):
    id: str
    candidate_id: str
    category: str
    score: int
    reviewer_id: str 
    note: str = ""
    created_at: datetime


# ---------------- candidates ----------------

class CandidateListItem(BaseModel):
    """Lightweight - GET /candidates. No scores, no internal_notes."""
    id: str
    name: str
    email: EmailStr
    role_applied: str
    status: CandidateStatus
    skills: list[str] = []
    created_at: datetime


class CandidateDetailReviewer(BaseModel):
    """GET /candidates/{id} as a reviewer sees it.."""
    id: str
    name: str
    email: EmailStr
    role_applied: str
    status: CandidateStatus
    skills: list[str] = []
    created_at: datetime
    scores: list[ScoreOut] = []


class CandidateDetailAdmin(CandidateDetailReviewer):
    """Admin sees everything the reviewer schema has, plus internal_notes."""
    internal_notes: str = ""


class CandidateCreate(BaseModel):
    """Not in the required endpoint table, but useful for seeding data and
    for the 'create a candidate, verify response' test case."""
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    role_applied: str = Field(min_length=1, max_length=100)
    skills: list[str] = []


# ---------------- auth ----------------

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    """Returned by /auth/me. The frontend calls this to find out who's
    logged in rather than decoding the JWT client-side - keeps that
    decoding logic in one place (auth.py), regardless of whether the
    token itself travels via header or cookie."""
    email: EmailStr
    role: Literal["reviewer", "admin"]