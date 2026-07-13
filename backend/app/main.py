import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import candidates
from .routers import auth as auth_router

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="TechKraft Candidate Dashboard")

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