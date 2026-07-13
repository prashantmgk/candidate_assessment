from fastapi import APIRouter, Depends, Query, status

from ..auth import CurrentUser, get_current_user, require_admin
from ..schemas import (
    CandidateCreate,
    CandidateDetailAdmin,
    CandidateDetailReviewer,
    CandidateListItem,
    CandidateListResponse,
    ScoreCreate,
    ScoreOut,
)
from ..services import candidate_service
from pydantic import BaseModel

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("", response_model=CandidateListResponse)
def list_candidates(
    status_: str | None = Query(default=None, alias="status"),
    role_applied: str | None = Query(default=None),
    skill: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    current_user: CurrentUser = Depends(get_current_user),
):
    return candidate_service.list_candidates(
        status_=status_, role_applied=role_applied, skill=skill,
        keyword=keyword, page=page, page_size=page_size,
    )


@router.post("", response_model=CandidateListItem, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_admin)])
def create_candidate(body: CandidateCreate):
    return candidate_service.create_candidate(body)



@router.get("/{candidate_id}", response_model=CandidateDetailReviewer | CandidateDetailAdmin)
def get_candidate(candidate_id: str, current_user: CurrentUser = Depends(get_current_user)):
    return candidate_service.get_candidate_detail(candidate_id, current_user)



@router.post("/{candidate_id}/scores", response_model=ScoreOut, status_code=status.HTTP_201_CREATED)
def submit_score(
    candidate_id: str,
    body: ScoreCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    return candidate_service.submit_score(candidate_id, body, current_user)



@router.post("/{candidate_id}/summary")
async def generate_summary(candidate_id: str, current_user: CurrentUser = Depends(get_current_user)):
    return await candidate_service.generate_summary(candidate_id)



@router.get("/{candidate_id}/stream")
async def stream_scores(candidate_id: str, current_user: CurrentUser = Depends(get_current_user)):
    return await candidate_service.stream_scores(candidate_id)


class NotesUpdate(BaseModel):
    internal_notes: str


@router.patch("/{candidate_id}/notes", dependencies=[Depends(require_admin)])
def update_notes(candidate_id: str, body: NotesUpdate):
    return candidate_service.update_notes(candidate_id, body.internal_notes)


@router.delete("/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_admin)])
def delete_candidate(candidate_id: str):
    candidate_service.delete_candidate(candidate_id)