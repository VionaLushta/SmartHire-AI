# Production Readiness

This document captures the release-focused review for SmartHire AI v2.1.

## Environment Variables

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

## Production Configuration Review

- FastAPI runs behind a production ASGI server.
- CORS is driven by configured origins instead of a wildcard.
- JWT-based authentication is already in place.
- Role-based guards protect privileged routes.
- Sensitive responses avoid stack traces and internal details.
- Uploaded files and generated reports are isolated under configured folders.

## Error Handling

- Validation errors return structured responses.
- Authentication and authorization failures return explicit 401 or 403 responses.
- Unhandled exceptions are converted to a generic 500 response.

## Logging

- Request logs are emitted by the API middleware.
- Security-related events are logged by the backend dependencies and services.
- Service-level logs already cover authentication, workflow, notifications, ranking, and audit events.

## Secrets

- Secrets are not committed in source files.
- Use platform secret managers for `SECRET_KEY`, SMTP credentials, and database credentials.
- Frontend `VITE_` variables are treated as public values and must not contain secrets.

## Deployment Targets

- Frontend: Vercel, Netlify, or any static hosting platform.
- Backend: Render, Railway, or any container-friendly ASGI host.
- Database: Managed PostgreSQL.
- Optional local deployment: Docker and Docker Compose.
