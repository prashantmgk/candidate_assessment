import asyncio
from datetime import datetime, timezone

from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse

from .. import db
from ..auth import CurrentUser
from ..schemas import (
    CandidateCreate,
    CandidateDetailAdmin,
    CandidateDetailReviewer,
    CandidateListItem,
    CandidateListResponse,
    ScoreCreate,
    ScoreOut,
)


def _get_or_404(candidate_id: str) -> dict:
    """Fetch a candidate from the DB or raise 404. Used internally by every
    operation that needs to confirm the candidate exists first."""
    candidate = db.get_candidate(candidate_id)
    if not candidate:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "candidate not found")
    return candidate


# List

def list_candidates(
    status_: str | None,
    role_applied: str | None,
    skill: str | None,
    keyword: str | None,
    page: int,
    page_size: int,
) -> CandidateListResponse:
    items, total = db.list_candidates(
        status=status_,
        role_applied=role_applied,
        skill=skill,
        keyword=keyword,
        page=page,
        page_size=page_size,
    )
    return CandidateListResponse(
        items=[CandidateListItem(**i) for i in items],
        page=page,
        page_size=page_size,
        total=total,
    )


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

def create_candidate(body: CandidateCreate) -> CandidateListItem:
    candidate = db.create_candidate(
        name=body.name,
        email=body.email,
        role_applied=body.role_applied,
        skills=body.skills,
    )
    return CandidateListItem(**candidate)


# Detail (role-aware)

def get_candidate_detail(
    candidate_id: str,
    current_user: CurrentUser,
) -> CandidateDetailReviewer | CandidateDetailAdmin:
    candidate = _get_or_404(candidate_id)

    if current_user.role == "admin":
        # Admins see every reviewer's scores and internal_notes
        scores = db.list_scores(candidate_id)
        return CandidateDetailAdmin(**candidate, scores=scores)

    # Reviewers see only their own scores; internal_notes is excluded
    # structurally by CandidateDetailReviewer not declaring the field
    # (Pydantic v2 extra="ignore" silently drops it).
    scores = db.list_scores(candidate_id, reviewer_id=current_user.email)
    return CandidateDetailReviewer(**candidate, scores=scores)


# Scoring

def submit_score(
    candidate_id: str,
    body: ScoreCreate,
    current_user: CurrentUser,
) -> ScoreOut:
    _get_or_404(candidate_id)
    # reviewer_id is always taken from the authenticated user, never from
    # the request body — a reviewer can't submit under someone else's name.
    score = db.submit_score(
        candidate_id=candidate_id,
        category=body.category,
        score=body.score,
        reviewer_id=current_user.email,
        note=body.note or "",
    )
    return ScoreOut(**score)


# Mock AI summary

async def _generate_mock_summary(candidate: dict, scores: list[dict]) -> str:
    """Simulates a real async LLM call: network I/O you'd await, not CPU
    work you'd block on — hence asyncio.sleep, not time.sleep, so the
    event loop can keep serving other requests while this 'call' is in
    flight."""
    await asyncio.sleep(2)

    if scores:
        avg = sum(s["score"] for s in scores) / len(scores)
        performance = "a strong" if avg >= 4 else "a mixed" if avg >= 3 else "a weaker"
    else:
        avg, performance = None, "an unscored"

    skills = ", ".join(candidate.get("skills", [])) or "no listed skills"
    summary = (
        f"{candidate['name']} is {performance} candidate for "
        f"{candidate['role_applied']}, with background in {skills}."
    )
    if avg is not None:
        summary += f" Average reviewer score so far: {avg:.1f}/5."
    return summary


async def generate_summary(candidate_id: str) -> dict:
    """Uses every score for the average — not just the requesting
    reviewer's own — because this is an aggregate number, not the
    underlying rows, so it doesn't leak another reviewer's individual
    notes/scores to a reviewer role."""
    candidate = _get_or_404(candidate_id)
    scores = db.list_scores(candidate_id)
    summary = await _generate_mock_summary(candidate, scores)
    return {"summary": summary, "generated_at": datetime.now(timezone.utc).isoformat()}



# SSE stream

async def stream_scores(candidate_id: str) -> StreamingResponse:
    """Minimal polling-based SSE, not a real push mechanism. Every 3 s it
    re-queries scores for this candidate and pushes the current count as
    an event. A production version would use DynamoDB Streams or a pub/sub
    layer (Redis, SNS) instead of polling per-connection, and note that
    this single-process approach doesn't fan out across multiple backend
    workers."""
    _get_or_404(candidate_id)

    async def event_generator():
        last_count = -1
        for _ in range(20):  # bounded loop so demo connections self-terminate
            scores = db.list_scores(candidate_id)
            if len(scores) != last_count:
                last_count = len(scores)
                yield f'data: {{"score_count": {last_count}}}\n\n'
            await asyncio.sleep(3)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# Admin: internal notes

def update_notes(candidate_id: str, notes: str) -> dict:
    _get_or_404(candidate_id)
    db.set_internal_notes(candidate_id, notes)
    return {"ok": True}


# Admin: soft delete

def delete_candidate(candidate_id: str) -> None:
    _get_or_404(candidate_id)
    db.soft_delete_candidate(candidate_id)
