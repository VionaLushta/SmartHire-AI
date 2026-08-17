# SmartHire AI Backend

FastAPI backend foundation for the SmartHire AI platform.

## Structure

- `app/api/`
- `app/core/`
- `app/database/`
- `app/models/`
- `app/schemas/`
- `app/services/`
- `app/repositories/`
- `app/utils/`
- `app/ml/`
- `app/uploads/`
- `app/reports/`

## Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file from `.env.example` and fill in the values you need.
4. Initialize Alembic is already prepared in `alembic/`.

5. Start the backend:

```bash
uvicorn app.main:app --reload
```

## Verification

- Open `http://127.0.0.1:8000/`
- Confirm the response is:

```json
{
  "message": "SmartHire AI API is running"
}
```

On startup, the application also checks the PostgreSQL connection and prints a success or readable failure message.
