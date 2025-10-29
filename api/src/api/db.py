import os
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url
from sqlmodel import Session
from sqlmodel import SQLModel
from sqlmodel import create_engine

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "gorillax.db"

_ENGINE: Engine | None = None


def _database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    return f"sqlite:///{DEFAULT_DB_PATH}"


def get_engine() -> Engine:
    global _ENGINE
    if _ENGINE is None:
        url = _database_url()
        parsed_url = make_url(url)
        connect_args = (
            {"check_same_thread": False}
            if parsed_url.get_backend_name() == "sqlite"
            else {}
        )
        _ENGINE = create_engine(url, echo=False, connect_args=connect_args)
    return _ENGINE


def reset_engine() -> None:
    global _ENGINE
    _ENGINE = None


def init_db() -> None:
    url = _database_url()
    parsed_url = make_url(url)
    if parsed_url.get_backend_name() == "sqlite" and parsed_url.database:
        Path(parsed_url.database).parent.mkdir(parents=True, exist_ok=True)
    engine = get_engine()
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    engine = get_engine()
    with Session(engine) as session:
        yield session
