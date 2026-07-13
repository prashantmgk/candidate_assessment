import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key, Attr

ENDPOINT = os.environ.get("DYNAMODB_ENDPOINT", "http://localhost:8000")

_resource = boto3.resource(
    "dynamodb",
    endpoint_url=ENDPOINT,
    region_name="us-east-1",
    aws_access_key_id="local",
    aws_secret_access_key="local",
)

candidates_table = _resource.Table("candidates")
scores_table = _resource.Table("scores")
users_table = _resource.Table("users")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------- candidates ----------------

def create_candidate(name: str, email: str, role_applied: str, skills: list[str]):
    item = {
        "id": str(uuid.uuid4()),
        "name": name,
        "name_lower": name.lower(),
        "email": email,
        "email_lower": email.lower(),
        "role_applied": role_applied,
        "status": "new",
        "skills": skills or [],
        "internal_notes": "",
        "created_at": now_iso(),
    }
    candidates_table.put_item(Item=item)
    return item

def get_candidate(candidate_id: str):
    return candidates_table.get_item(Key={"id": candidate_id}).get("Item")


def list_candidates(status=None, role_applied=None, skill=None, keyword=None,
                     page: int = 1, page_size: int = 20):
    page_size = min(page_size, 50)

    # 1. Let DynamoDB handle the skill filter if present
    filter_expr = None
    if skill:
        filter_expr = Attr("skills").contains(skill)

    # 2. Fetch from DynamoDB. 
    # We can still use the GSI for 'status' because statuses ("new", "reviewed") 
    # are exact single-word matches. Otherwise, fallback to a scan.
    if status:
        kwargs = dict(IndexName="status-created_at-index",
                      KeyConditionExpression=Key("status").eq(status))
        if filter_expr is not None:
            kwargs["FilterExpression"] = filter_expr
        items = candidates_table.query(**kwargs)["Items"]
    else:
        kwargs = {}
        if filter_expr is not None:
            kwargs["FilterExpression"] = filter_expr
        items = candidates_table.scan(**kwargs)["Items"]

    # 3. Handle Case-Insensitive, Substring Role Filtering in memory
    if role_applied:
        role_lower = role_applied.lower()
        items = [
            item for item in items 
            if role_lower in item.get("role_applied", "").lower()
        ]

    # 4. Handle Case-Insensitive Keyword Filtering in memory
    if keyword:
        kw_lower = keyword.lower()
        items = [
            item for item in items 
            if kw_lower in item.get("name", "").lower() or kw_lower in item.get("email", "").lower()
        ]

    # 5. Sort and Paginate
    items.sort(key=lambda c: c["created_at"], reverse=True)
    total = len(items)
    start = (page - 1) * page_size
    return items[start:start + page_size], total


def soft_delete_candidate(candidate_id: str):
    candidates_table.update_item(
        Key={"id": candidate_id},
        UpdateExpression="SET #s = :archived, deleted_at = :now",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":archived": "archived", ":now": now_iso()},
    )


def set_internal_notes(candidate_id: str, notes: str):
    candidates_table.update_item(
        Key={"id": candidate_id},
        UpdateExpression="SET internal_notes = :n",
        ExpressionAttributeValues={":n": notes},
    )


# ---------------- scores ----------------

def submit_score(candidate_id: str, category: str, score: int, reviewer_id: str, note: str = ""):
    item = {
        "candidate_id": candidate_id,
        "id": str(uuid.uuid4()),
        "category": category,
        "score": score,
        "reviewer_id": reviewer_id,
        "note": note or "",
        "created_at": now_iso(),
    }
    scores_table.put_item(Item=item)
    return item


def list_scores(candidate_id: str, reviewer_id: str | None = None):
    """reviewer_id set -> only that reviewer's own scores (reviewer role).
    reviewer_id None -> every score for the candidate (admin role)."""
    kwargs = dict(KeyConditionExpression=Key("candidate_id").eq(candidate_id))
    if reviewer_id:
        kwargs["FilterExpression"] = Attr("reviewer_id").eq(reviewer_id)
    return scores_table.query(**kwargs)["Items"]



def create_user(email: str, password_hash: str, role: str = "reviewer"):
    item = {
        "email": email,
        "id": str(uuid.uuid4()),
        "password_hash": password_hash,
        "role": role,  # never accept this from the client - callers must hardcode "reviewer"
        "created_at": now_iso(),
    }
    users_table.put_item(Item=item, ConditionExpression=Attr("email").not_exists())
    return item


def get_user_by_email(email: str):
    return users_table.get_item(Key={"email": email}).get("Item")