# SmartHire AI Backend

FastAPI backend for SmartHire AI.

## What Lives Here

- `app/api` - route handlers
- `app/core` - settings, security, pagination, and dependencies
- `app/database` - engine and session setup
- `app/models` - SQLAlchemy models
- `app/repositories` - database access layer
- `app/services` - business rules
- `app/schemas` - request and response contracts
- `app/ml` - parsing, matching, ranking, and analytics helpers
- `alembic` - database migrations
- `tests` - backend tests

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

## Useful Endpoints

- API root: `http://127.0.0.1:8000`
- OpenAPI docs: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Notes

- The backend reads configuration from `backend/.env`.
- Keep migrations in sync with model changes.
- Route handlers should stay thin and delegate to services.
- Production deployment examples are documented in the repository root release package.
