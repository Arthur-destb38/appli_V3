from fastapi import FastAPI

from .db import init_db
from .routes import exercises
from .routes import health

app = FastAPI(title="Gorillax API", version="0.1.0")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


app.include_router(health.router)
app.include_router(exercises.router)


@app.get("/", tags=["meta"], summary="API metadata")
async def read_root() -> dict[str, str]:
    return {"status": "running"}
