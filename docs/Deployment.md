# Deployment Guide

## Deployment Model

SmartHire AI is deployed as two applications:

- A FastAPI backend service.
- A Vite-built React frontend served from a static host or web server.

PostgreSQL stores the production data, while uploaded files and generated reports should be persisted to a durable volume or object store.

## Required Environment Variables

### Backend

- `DATABASE_URL`
- `SECRET_KEY`
- `ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`
- `UPLOAD_FOLDER`
- `REPORT_FOLDER`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_USE_TLS`

### Frontend

- `VITE_API_URL`
- `VITE_APP_NAME`
- `VITE_APP_VERSION`
- `VITE_FEATURE_VIDEO_INTERVIEW`
- `VITE_FEATURE_OAUTH`
- `VITE_FEATURE_ADVANCED_ANALYTICS`
- `VITE_ANALYTICS_ID`
- `VITE_SENTRY_DSN`
- `VITE_DEBUG`

## Backend Startup

Use a production WSGI/ASGI server such as Uvicorn behind a reverse proxy:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For managed environments, run the backend as a service process with environment variables injected by the platform.

## Frontend Production Build

Build the application with:

```bash
npm run build
```

Deploy the generated static files from the `dist/` directory to a static host, CDN, or reverse proxy document root.

## Database Preparation

1. Provision PostgreSQL.
2. Create the application database and user.
3. Apply migrations or initialize the schema used by the ORM models.
4. Verify the backend can connect using `DATABASE_URL`.

## Operational Notes

- Restrict CORS to configured frontend origins.
- Store uploads and reports in durable storage.
- Rotate secrets through the platform secret manager.
- Monitor backend logs for validation and authorization failures.

## Release Package

- `vercel.json` and `netlify.toml` provide frontend deployment examples.
- `render.yaml` and `railway.json` provide backend deployment examples.
- `backend/Dockerfile`, `frontend/Dockerfile`, and `docker-compose.production.yml` provide optional container deployment support.
- `docs/Production-Readiness.md` and `docs/Monitoring.md` capture release operations guidance.
