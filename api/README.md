# Gorillax API

Backend FastAPI pour Gorillax MVP.

## Installation

```bash
uv sync
```

## Lancer l'API (hot reload)

```bash
uv run uvicorn api.main:app --reload
```

## Qualité & tests

```bash
uv run ruff check
uv run mypy src
uv run pytest
```

## Seed des exercices

```bash
uv run python scripts/seed.py
```
