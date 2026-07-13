import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .scripts import create_table, seed
from .routers import candidates
from .routers import auth as auth_router

logger = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # create_tables.main() is idempotent (catches ResourceInUseException),
    # so running it on every container start - not just the first - is
    # safe. This means `docker compose up` alone is enough to get a ready
    # system, no separate manual script step required.
    create_table.main()
    seed.main()
    yield

app = FastAPI(title="TechKraft Candidate Dashboard", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(candidates.router)
app.include_router(auth_router.router)