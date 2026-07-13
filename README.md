# TechKraft Candidate Scoring Dashboard

An internal recruitment tool for TechKraft. Reviewers score candidates across categories; admins get full visibility, internal notes, and a mock AI-generated summary per candidate.

---

## Table of Contents

1. [Stack](#stack)
2. [Project Structure](#project-structure)
3. [Setup & Run](#setup--run)
4. [Environment Variables](#environment-variables)
5. [Creating an Admin Account](#creating-an-admin-account)
6. [Running Tests](#running-tests)
7. [Example API Calls](#example-api-calls)
8. [Architecture Decision Records](#architecture-decision-records)
9. [Debugging: Bug Identification](#debugging-bug-identification)
10. [Learning Reflection](#learning-reflection)
11. [Known Limitations](#known-limitations)

---

## Stack

| Layer    | Technology                                          |
|----------|-----------------------------------------------------|
| Backend  | Python 3.11, FastAPI, uvicorn                       |
| Database | DynamoDB-local (Docker), boto3                      |
| Auth     | JWT (PyJWT), bcrypt, Bearer-token via header        |
| Frontend | React 19, Vite, TanStack Query, React Router v7, Tailwind CSS |
| Testing  | pytest, FastAPI TestClient, httpx                   |
| Infra    | Docker, Docker Compose                              |

---

## Project Structure

```
candidate_assessment/
├── backend/
│   ├── app/
│   │   ├── auth.py              # Password hashing, JWT issue/decode, FastAPI dependencies
│   │   ├── create_admin.py      # CLI helper to create the first admin user
│   │   ├── db.py                # Data-access layer  all DynamoDB queries in one place
│   │   ├── main.py              # FastAPI app factory, lifespan hooks, CORS
│   │   ├── schemas.py           # Pydantic v2 request/response models
│   │   ├── routers/
│   │   │   ├── auth.py          # POST /auth/register, /auth/login, GET /auth/me
│   │   │   └── candidates.py    # All /candidates/* endpoints
│   │   └── scripts/
│   │       ├── create_table.py  # Idempotent DynamoDB table + GSI creation
│   │       └── seed.py          # Seeds 55 fake candidates on first startup
│   ├── tests/
│   │   └── test_api.py          # Integration tests against real DynamoDB-local
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/                 # Fetch wrappers (client.js, auth.js, candidates.js)
│   │   ├── context/             # AuthProvider  token stored in-memory, not localStorage
│   │   ├── pages/               # LoginPage, RegisterPage, CandidateListPage, CandidateDetailPage
│   │   ├── routes/              # ProtectedRoute wrapper
│   │   ├── hooks/               # Custom React hooks
│   │   └── App.jsx
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Setup & Run

**Prerequisite:** Docker Desktop must be installed and running.

### 1. Clone & configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` work for local development out of the box  you only need to change `JWT_SECRET` if you care about token security locally.

### 2. Start all services

```bash
docker compose up --build
```

This brings up **three containers**:

| Service          | Host Port | URL                                    | Notes                                                      |
|------------------|-----------|----------------------------------------|------------------------------------------------------------|
| `frontend`       | `5173`    | http://localhost:5173                  | React + Vite dev server with hot-reload                    |
| `backend`        | `8000`    | http://localhost:8000/docs (Swagger)   | FastAPI, reloads on file changes via mounted volume        |
| `dynamodb-local` | `8001`    |                                       | Exposed on 8001 on the host; backend reaches it on port 8000 via the internal Docker network |

> **No manual migration step is needed.** On every backend startup, `scripts/create_table.py` runs idempotently (skips tables that already exist), and `scripts/seed.py` inserts 55 fake candidates only when the table is empty.

### 3. Open the app

| Interface     | URL                              |
|---------------|----------------------------------|
| Frontend UI   | http://localhost:5173            |
| Swagger UI    | http://localhost:8000/docs       |
| ReDoc         | http://localhost:8000/redoc      |

---

## Environment Variables

| Variable              | Default                        | Container    | Purpose                                     |
|-----------------------|--------------------------------|--------------|---------------------------------------------|
| `JWT_SECRET`          | `change-me-in-production`      | `backend`    | Signs and verifies JWT tokens               |
| `DYNAMODB_ENDPOINT`   | `http://dynamodb-local:8000`   | `backend`    | Internal docker-network address of the DB   |
| `VITE_API_URL`        | `http://localhost:8000`        | `frontend`   | Base URL the React app uses for API calls   |

---

## Creating an Admin Account

`POST /auth/register` always creates a `reviewer`. The `UserRegister` schema has no `role` field at all  this is by design so there is nothing a client can spoof. Admin accounts are created exclusively via a CLI module that runs inside the backend container (and therefore already requires server access):

```bash
docker compose exec backend python -m app.create_admin admin@techkraft.com yourpassword
```

You can then log in with those credentials in the UI or via `curl`.

---

## Running Tests

Tests run inside the backend container against the live `dynamodb-local` instance:

```bash
docker compose exec backend pytest tests/ -v
```

The suite covers three scenarios:

| Test | What it verifies |
|------|-----------------|
| `test_candidates_requires_auth` | `GET /candidates` without a token → `401` |
| `test_create_candidate_endpoint` | Admin `POST /candidates` → `201`, correct shape, `status: "new"` |
| `test_reviewer_cannot_see_another_reviewers_scores` | Two reviewers each score the same candidate; each sees only their own score; `internal_notes` is **structurally absent** (not just empty) from reviewer responses; admin sees all scores + `internal_notes` |

---

## Example API Calls

> Substitute `<token>`, `<admin_token>`, or `<reviewer_token>` with the `access_token` value returned by `/auth/login`.

### Register a reviewer account

```bash
curl -s -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "reviewer1@techkraft.com", "password": "password123"}'
```

### Log in and capture the JWT

```bash
curl -s -X POST http://localhost:8000/auth/login \
  -d "username=reviewer1@techkraft.com&password=password123"
# Response: {"access_token": "eyJ...", "token_type": "bearer"}
```

### Get current user identity

```bash
curl -s http://localhost:8000/auth/me \
  -H "Authorization: Bearer <token>"
# Response: {"email": "reviewer1@techkraft.com", "role": "reviewer"}
```

### Create a candidate *(admin only)*

```bash
curl -s -X POST http://localhost:8000/candidates \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Anand",
    "email": "priya@example.com",
    "role_applied": "Full-stack Engineer",
    "skills": ["React", "FastAPI", "DynamoDB"]
  }'
```

### List candidates (with optional filters)

```bash
# Filter by status
curl -s "http://localhost:8000/candidates?status=new&page=1&page_size=20" \
  -H "Authorization: Bearer <token>"

# Filter by role (case-insensitive substring match)
curl -s "http://localhost:8000/candidates?role_applied=engineer" \
  -H "Authorization: Bearer <token>"

# Filter by skill
curl -s "http://localhost:8000/candidates?skill=python" \
  -H "Authorization: Bearer <token>"

# Search by keyword (matches name or email)
curl -s "http://localhost:8000/candidates?keyword=priya" \
  -H "Authorization: Bearer <token>"
```

### Get a single candidate's detail

```bash
curl -s http://localhost:8000/candidates/<candidate_id> \
  -H "Authorization: Bearer <token>"
# Reviewers see only their own scores; admins see all scores + internal_notes
```

### Submit a score

```bash
curl -s -X POST http://localhost:8000/candidates/<candidate_id>/scores \
  -H "Authorization: Bearer <reviewer_token>" \
  -H "Content-Type: application/json" \
  -d '{"category": "Technical", "score": 4, "note": "Strong on system design"}'
```

### Generate a mock AI summary (~2 s simulated delay)

```bash
curl -s -X POST http://localhost:8000/candidates/<candidate_id>/summary \
  -H "Authorization: Bearer <token>"
# Response: {"summary": "Priya Anand is a strong candidate for ...", "generated_at": "..."}
```

### Update internal notes *(admin only)*

```bash
curl -s -X PATCH http://localhost:8000/candidates/<candidate_id>/notes \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"internal_notes": "Strong cultural fit. Schedule final round."}'
```

### Soft-delete a candidate *(admin only)*

```bash
curl -s -X DELETE http://localhost:8000/candidates/<candidate_id> \
  -H "Authorization: Bearer <admin_token>"
# 204 No Content  sets status="archived"; the row is never hard-deleted
```

---

## Architecture Decision Records

### ADR 1 : DynamoDB GSIs for `status` and `role_applied` instead of a single-table scan

**Context**

`GET /candidates` must support four independent filters (`status`, `role_applied`, `skill`, `keyword`) and pagination. DynamoDB has no `WHERE` clause  every keyed query must target a partition key, or it devolves into an expensive full-table scan.

**Decision**

Two Global Secondary Indexes (GSIs) are defined on the `candidates` table:

| GSI name                         | Partition key  | Sort key     | Serves                                        |
|----------------------------------|----------------|--------------|-----------------------------------------------|
| `status-created_at-index`        | `status`       | `created_at` | `?status=new`, `?status=reviewed`, …          |
| `role_applied-created_at-index`  | `role_applied` | `created_at` | `?role_applied=Backend Engineer` (exact match)|

When `status` is present, `db.list_candidates` issues a `query()` against the status GSI and adds `skill` as a server-side `FilterExpression` (DynamoDB evaluates it after the key lookup so only one partition is scanned). `keyword` (name/email substring) and case-insensitive role substring matching are applied in Python afterward, because DynamoDB has no equivalent of SQL's `LIKE`.

The `scores` table needs no GSI at all: `candidate_id` is already the partition key, so "all scores for candidate X" is a native key query, and reviewer-scoped RBAC filtering is a cheap `FilterExpression` within that already-narrow partition.

**Trade-off**

When a caller sends `GET /candidates` with no `status` filter, there is no key to query against, and `db.list_candidates` falls back to a full `scan`. Acceptable for an internal tool at this scale; a production version would require a default status filter, add a synthetic "all items" GSI, or move free-text search to a dedicated service (e.g. OpenSearch).

---

### ADR 2 : Role is never accepted from the client; admin accounts require an out-of-band CLI step

**Context**

Every role-based system faces a bootstrapping problem: how do you create the first privileged user without exposing a public endpoint that can be exploited to grant elevated roles?

**Decision**

`schemas.UserRegister` has no `role` field  not just ignored, but structurally absent  so there is literally nothing a client can send to influence their role. `auth.register_user()` hardcodes `role="reviewer"` unconditionally. Admin accounts are provisioned via:

```bash
docker compose exec backend python -m app.create_admin <email> <password>
```

This runs inside the backend container, which already requires server/container access, providing a natural access-control boundary.

**Trade-off**

There is no self-service admin promotion path, which is the point. In production this would be an internal admin panel behind its own authentication layer, not a shell command  but for a take-home context the CLI approach keeps the security boundary clear without adding a whole admin-admin role tier.

---

### ADR 3 : JWT `get_current_user` re-fetches the user from DynamoDB on every request

**Context**

Standard JWTs are stateless: the server trusts the signed `role` claim for the token's entire lifetime with no database round-trip. This is fast but means a revoked or role-changed token keeps working until it expires (8 hours in this project).

**Decision**

`auth.get_current_user` decodes the JWT to extract the `email` (`sub` claim), then immediately performs a `GetItem` on the `users` table to read the *current* role from DynamoDB before constructing the `CurrentUser` object passed to route handlers. The JWT's own `role` claim is not trusted past the initial signature check.

**Trade-off**

One extra DynamoDB read per authenticated request. For an internal recruiting tool where a mis-scoped reviewer token or a terminated employee's account is a genuine security concern, immediate revocation is worth this cost. A high-throughput public API would likely accept the revocation lag and drop the extra read.

---

## Debugging: Bug Identification

Consider this naive candidate-listing function:

```python
def search_candidates(status: str, keyword: str, page: int, page_size: int):
    all_candidates = db.execute("SELECT * FROM candidates").fetchall()
    filtered = [c for c in all_candidates if c["status"] == status]
    offset = (page - 1) * page_size
    return filtered[offset : offset + page_size]
```

### What is wrong

**The entire table is loaded into application memory on every request, regardless of the filter or the requested page size.** There are three compounding problems:

1. **No predicate push-down.** `SELECT * FROM candidates` fetches every row in the table before the Python list comprehension applies the `status` filter. The database does zero filtering work.

2. **Pagination is cosmetic.** The caller sees 20 rows, but the database paid to read every row that exists. Pagination's whole purpose is to cap the *cost* per request  here it only caps the response payload size.

3. **Linear cost scaling.** At 50 candidates the bug is invisible. At 50,000, every single list request reads 50,000 rows to return 20. At 5,000,000 the process runs out of memory or times out. The per-request cost grows proportionally to total table size, never to page size.

### Root cause

Filtering and pagination are applied in the wrong layer  Python instead of the database. The database engine has indexes and query planners specifically designed to avoid reading rows that don't match a predicate.

### Correct fix

Push the filter down so the database reads only matching rows:

**SQL (with an index on `status`):**

```sql
SELECT * FROM candidates
WHERE  status = ?
ORDER  BY created_at DESC
LIMIT  ? OFFSET ?;
```

**DynamoDB : what this project actually does in `db.list_candidates`:**

```python
# Query the GSI keyed on `status`.
# DynamoDB reads only items whose status partition key matches 
# the rest of the table is never touched.
items = candidates_table.query(
    IndexName="status-created_at-index",
    KeyConditionExpression=Key("status").eq(status),
)["Items"]
```

Any remaining in-memory work (role substring check, keyword filter, Python-side sort and slice) is acceptable *after* the GSI already narrowed the result set to a small partition. Ideally, pagination would use DynamoDB's native `ExclusiveStartKey` / `LastEvaluatedKey` cursor mechanism rather than a Python slice, since numeric offsets (`page * page_size`) require discarding rows the database already read  they don't map cleanly onto DynamoDB's pagination model.

---

## Learning Reflection

The most significant shift this project forced was **designing around query access patterns before writing any application code**. In a relational system you normalize first and tune indexes reactively when queries prove slow. With DynamoDB you must enumerate every query the application will ever make  which GSI, which `KeyConditionExpression`, which attributes will be filter-only  *before* calling `create_table`, because changing the key schema afterward requires rebuilding the table.

The clearest lesson came from the `GET /candidates` endpoint. Four filter parameters sound straightforward until you realize DynamoDB needs a partition key for every efficient query, and only one of the four filters (`status`) could be turned into a reliable key condition for the queries I expected to be most common. `skill` requires DynamoDB's `contains()` function, which works only as a `FilterExpression` (not a key condition), and `keyword` is a substring match that DynamoDB cannot do at all at the key level  both had to stay in Python. Deciding which filters earned a GSI and which were acceptable in-memory operations required thinking about cardinality and query selectivity up front, which is a very different mental model from SQL.

The JWT re-validation choice (ADR 3) was another deliberate trade-off moment: adding one DynamoDB read per request to buy immediate role revocation. Having to articulate *why* the extra latency was worth it  rather than defaulting to stateless JWT because "that's how JWT works"  was a useful exercise in matching technical decisions to the specific threat model of the product.

**Given more time, two things I would change:**

1. **Cursor-based pagination.** The current implementation queries a GSI, sorts the full result in Python, and slices it. Replacing numeric `page`/`page_size` with DynamoDB's `ExclusiveStartKey` / `LastEvaluatedKey` would push pagination entirely into the database and make every list request truly O(page\_size) regardless of total table size.

2. **Persist the AI summary.** `POST /candidates/{id}/summary` re-generates the summary on every call with a 2-second simulated delay. Adding `ai_summary` and `ai_summary_generated_at` attributes to the candidate item and only regenerating when explicitly triggered (or when scores change) would eliminate the repeated wait and make the UX noticeably faster.

---

## Known Limitations

- `GET /candidates` with no `status` filter falls back to a full DynamoDB table scan (see ADR 1).
- Case-insensitive substring matching for `role_applied` and `keyword` happens in Python after the GSI query.
- The mock AI summary is not persisted  it is regenerated on every `POST /candidates/{id}/summary` call.
- The SSE stream endpoint (`GET /candidates/{id}/stream`) polls DynamoDB every 3 seconds per open connection instead of using DynamoDB Streams or a pub/sub layer; it also will not fan out across multiple backend workers.
- No rate limiting on `/auth/login` or `/auth/register`.
- JWT lifetime is 8 hours with no refresh-token mechanism; users must re-login after expiry.
