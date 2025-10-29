# Gorillax MVP V2

Objectif : fournir une application mobile (Expo/React Native) et une API FastAPI pour créer, suivre et partager ses séances.

## Structure

- `app/` : application mobile Expo
- `api/` : API FastAPI
- `docs/` : documentation

## Pré-requis outils

- `pnpm` pour gérer l’app Expo
- `uv` (ou Python 3.12+) pour l’API FastAPI

## Commandes principales

### Mobile (Expo)

```bash
cd app
pnpm install
pnpm lint
pnpm start
```

### API FastAPI

```bash
cd api
uv sync
uv run ruff check
uv run mypy src
uv run pytest
uv run uvicorn api.main:app --reload
```

### Seed exercices (API)

```bash
cd api
uv run python scripts/seed.py
```

### Lancement combiné

```bash
pnpm run dev
```

Ce script lance Expo (`app/`) et FastAPI (`api/`) en parallèle.  
Alternative manuelle si besoin : ouvrir deux terminaux et exécuter respectivement `cd app && pnpm start` puis `cd api && uv run uvicorn api.main:app --reload`.

## Prochaines étapes

1. Ajouter les flux CRUD complets côté API.
2. Intégrer TanStack Query et la persistance SQLite côté app.
3. Configurer la CI (lint + tests) et un script de lancement combiné (`pnpm dev`).
