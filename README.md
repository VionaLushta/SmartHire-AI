# SmartHire AI

SmartHire AI is a recruitment SaaS platform for hiring teams and candidates. It combines a React 19 frontend, a FastAPI backend, PostgreSQL persistence, and AI-assisted workflows for resume analysis, job matching, and analytics.

## Project Banner

Banner placeholder: add approved artwork at `docs/banner.svg` when the brand asset is finalized.

## Screenshots

- Landing page placeholder: `docs/screenshots/landing-page.png`
- Candidate dashboard placeholder: `docs/screenshots/candidate-dashboard.png`
- Company dashboard placeholder: `docs/screenshots/company-dashboard.png`
- Admin analytics placeholder: `docs/screenshots/admin-analytics.png`

## Features

- Job posting and job management
- Candidate profiles with education, certificates, and resumes
- Saved jobs and applied jobs tracking
- Company and department administration
- Role-based dashboards for candidates, companies, and administrators
- Analytics views for hiring activity and pipeline health
- FastAPI OpenAPI documentation for every backend route

## AI Features

- Resume parsing from uploaded documents
- Skill extraction and normalization
- Job-to-candidate match scoring
- Candidate ranking for open roles
- Recommendation support for candidate job discovery
- Recruitment analytics and exportable reports

## Documentation

- [Architecture](docs/Architecture.md)
- [Installation](docs/Installation.md)
- [Deployment](docs/Deployment.md)
- [Production Readiness](docs/Production-Readiness.md)
- [Monitoring](docs/Monitoring.md)
- [Release Notes](docs/Release-Notes-v2.1.md)
- [Release Report](docs/Release-Report.md)
- [Portfolio Assets](docs/Portfolio-Assets.md)
- [Known Limitations](docs/Known-Limitations.md)
- [API Reference](docs/API.md)
- [Database](docs/Database.md)
- [AI Pipeline](docs/AI-Pipeline.md)
- [OCR](docs/OCR.md)
- [NLP](docs/NLP.md)
- [Power BI](docs/PowerBI.md)
- [SMTP](docs/SMTP.md)
- [Project Structure](docs/Project-Structure.md)
- [Security](docs/Security.md)
- [Workflow](docs/Workflow.md)

## Architecture

```
React 19 + Vite + Redux Toolkit
            ->
FastAPI + SQLAlchemy + Alembic
            ->
PostgreSQL
```

- The frontend renders a routed single-page application with shared layouts, protected routes, and centralized state.
- The backend exposes REST endpoints and keeps request handling thin by delegating business rules to services.
- The database layer is organized with repositories and migrations so schema changes stay predictable.
- AI and analytics live in dedicated service modules backed by focused ML helpers.

## Frontend Architecture

- `src/routes` owns route registration, session bootstrapping, and route guards.
- `src/layouts` provides the shell for authenticated and public views.
- `src/redux` contains the store plus feature slices for auth, jobs, companies, candidates, and applications.
- `src/services` centralizes API calls and auth persistence.
- `src/context` handles cross-cutting UI concerns such as theming and notifications.
- `src/components` holds reusable UI, layout, dashboard, auth, company, candidate, job, profile, and resume components.

## Backend Architecture

- `backend/app/api` contains FastAPI routers and request handlers.
- `backend/app/services` holds business logic and orchestration.
- `backend/app/repositories` isolates database access.
- `backend/app/models` defines SQLAlchemy ORM entities.
- `backend/app/schemas` defines request and response contracts.
- `backend/app/ml` contains resume parsing, skill extraction, ranking, recommendation, and analytics helpers.
- `backend/alembic` stores migration history and migration tooling.

## Database Layer

- PostgreSQL stores users, candidates, companies, departments, jobs, resumes, certificates, education records, refresh tokens, and application data.
- Alembic migrations keep schema history reproducible.
- Repository classes encapsulate query logic so services do not depend on raw SQL throughout the codebase.
- Indexes are used for common access paths such as foreign keys and dashboard queries.

## Repository Pattern

- Each repository focuses on one domain area.
- Repositories provide create, read, update, delete, list, and filtered lookup operations.
- Services depend on repositories instead of composing SQL directly.
- This keeps the backend testable and makes schema changes easier to isolate.

## Service Layer

- Services enforce domain rules, authorization checks, and orchestration.
- API handlers only collect input, resolve dependencies, and forward work to services.
- AI, analytics, job management, and profile features each have their own service classes.
- This structure keeps request handlers small and consistent.

## Redux Flow

1. `AuthInitializer` boots the session on app load.
2. `authSlice` restores persisted state from `localStorage`.
3. Feature slices dispatch async thunks to their service modules.
4. `src/services/api.js` attaches the bearer token and handles expiry.
5. Slice reducers store the server response and keep UI state in sync.

## Authentication Flow

- Users register or log in through `/auth/register` and `/auth/login`.
- The backend returns an access token and refresh token pair.
- The frontend stores the session payload in browser storage.
- `ProtectedRoute` blocks unauthenticated access and enforces role checks.
- Expired sessions trigger a global `auth:expired` event and redirect to the session-expired screen.

## AI Flow

1. A resume is uploaded or parsed through the AI endpoints.
2. The backend extracts text and identifies skills.
3. Match and recommendation services compare the candidate profile with open roles.
4. Ranking endpoints score candidates for a given job.
5. Analytics endpoints aggregate application and hiring metrics for dashboards and exports.

## Tech Stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, Vite, Redux Toolkit, React Router, Tailwind CSS, Axios |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic, Uvicorn |
| Database | PostgreSQL |
| AI / Analytics | Resume parsing, skill extraction, match scoring, ranking, reporting |

## Folder Structure

```text
.
|-- backend/
|   |-- app/
|   |   |-- api/
|   |   |-- core/
|   |   |-- database/
|   |   |-- models/
|   |   |-- repositories/
|   |   |-- schemas/
|   |   |-- services/
|   |   |-- ml/
|   |   |-- utils/
|   |   `-- main.py
|   |-- alembic/
|   |-- tests/
|   |-- requirements.txt
|   `-- pytest.ini
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- layouts/
|   |   |-- routes/
|   |   |-- redux/
|   |   |-- services/
|   |   |-- context/
|   |   |-- hooks/
|   |   |-- utils/
|   |   |-- constants/
|   |   `-- styles/
|   |-- public/
|   |-- index.html
|   |-- vite.config.js
|   `-- package.json
|-- README.md
|-- API.md
|-- ARCHITECTURE.md
|-- CONTRIBUTING.md
|-- CHANGELOG.md
|-- LICENSE
`-- alembic.ini
```

## Project Structure

| Folder | Purpose |
| --- | --- |
| `backend/app/api` | FastAPI routers and endpoint handlers |
| `backend/app/core` | Settings, security, pagination, and shared dependencies |
| `backend/app/database` | SQLAlchemy engine and session setup |
| `backend/app/models` | ORM entities and relationships |
| `backend/app/repositories` | Database access layer |
| `backend/app/services` | Domain logic and orchestration |
| `backend/app/ml` | Resume parsing, recommendation, ranking, and analytics helpers |
| `backend/alembic` | Migration scripts and Alembic environment |
| `frontend/src/components` | Shared UI and feature components |
| `frontend/src/pages` | Routed views for public and authenticated screens |
| `frontend/src/layouts` | Application shells and page wrappers |
| `frontend/src/routes` | Router setup and access control |
| `frontend/src/redux` | Global state store and slices |
| `frontend/src/services` | API client and domain service modules |
| `frontend/src/context` | Theme and notification providers |
| `frontend/src/styles` | Global styling and design tokens |
| `frontend/public` | Static public assets such as the favicon |

## Important Folders

- `backend/app/api` keeps HTTP handlers thin and grouped by domain.
- `backend/app/services` contains the application rules you would normally test first.
- `backend/app/repositories` isolates database reads and writes.
- `frontend/src/pages` maps directly to the route-level screens.
- `frontend/src/redux/slices` keeps feature state and async flows isolated by domain.
- `frontend/src/services` centralizes requests, token handling, and response normalization.

## Backend

- FastAPI serves the REST API and OpenAPI docs.
- SQLAlchemy models and Alembic migrations manage the schema.
- Authentication uses JWT access and refresh tokens.
- File-based features handle resumes and certificates through service classes.

## Frontend

- React 19 powers the UI and route composition.
- Redux Toolkit keeps authentication and feature data predictable.
- The router separates public pages from protected candidate, company, and admin areas.
- Axios handles API communication, retries, and session expiry events.

## Database

- PostgreSQL is the source of truth for users, jobs, applications, resumes, and analytics data.
- Migrations live under `backend/alembic/versions`.
- The schema is optimized around foreign keys, dashboard aggregations, and role-aware queries.

## Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Machine Learning

- Resume parsing extracts text and structured candidate data.
- Skill extraction turns raw text into normalized skills.
- Job matching compares resume data against role requirements.
- Candidate ranking scores applicants for a specific role.
- Analytics helpers summarize hiring activity for dashboards and exports.

## Installation Guide

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 18+
- Git

### Backend

```bash
git clone <repository-url>
cd SmartHire-AI/backend
python -m venv .venv
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Windows cmd: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

### Root

- No root-level runtime variables are required.
- Use `backend/.env.example` and `frontend/.env.example` for all application settings.

### Backend

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by SQLAlchemy and Alembic |
| `SECRET_KEY` | Signing key for JWT tokens |
| `ALGORITHM` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime in minutes |
| `UPLOAD_FOLDER` | Storage path for uploaded resumes and certificates |
| `REPORT_FOLDER` | Storage path for generated reports |

### Frontend

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Base URL for the backend API |
| `VITE_APP_NAME` | Application name displayed in the browser and UI |
| `VITE_APP_VERSION` | Frontend version string |
| `VITE_FEATURE_VIDEO_INTERVIEW` | Optional feature flag for future interview flows |
| `VITE_FEATURE_OAUTH` | Optional feature flag for OAuth login |
| `VITE_FEATURE_ADVANCED_ANALYTICS` | Optional feature flag for analytics modules |
| `VITE_ANALYTICS_ID` | Optional analytics provider identifier |
| `VITE_SENTRY_DSN` | Optional error-tracking DSN |
| `VITE_DEBUG` | Optional frontend debug toggle |

## Running Backend

```bash
cd backend
uvicorn app.main:app --reload
```

- API root: `http://127.0.0.1:8000`
- OpenAPI UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Running Frontend

```bash
cd frontend
npm run dev
```

- Default Vite URL: `http://localhost:5173`
- Make sure `VITE_API_URL` points to the backend API base.

## Database Migration

```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
alembic downgrade -1
```

## API Overview

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Candidate

- `GET /candidate/profile`
- `PUT /candidate/profile`
- `GET /candidate/{candidate_id}`
- `GET /candidate/dashboard`

### Company

- `POST /companies`
- `GET /companies`
- `GET /companies/{company_id}`
- `PUT /companies/{company_id}`
- `DELETE /companies/{company_id}`
- `GET /companies/{company_id}/dashboard`

### Jobs

- `POST /jobs`
- `GET /jobs`
- `GET /jobs/{job_id}`
- `PUT /jobs/{job_id}`
- `DELETE /jobs/{job_id}`
- `GET /jobs/{job_id}/dashboard`

### Applications

- There is no standalone `/applications` router in the current backend.
- Application data is currently surfaced through candidate, company, job, and analytics dashboards.
- Related views also exist in the frontend admin application area.

### Resume

- `POST /resume/upload`
- `GET /resume`
- `DELETE /resume/{resume_id}`

### Certificates

- `POST /certificates`
- `GET /certificates`
- `DELETE /certificates/{cert_id}`

### Education

- `POST /education`
- `GET /education`
- `GET /education/{education_id}`
- `PUT /education/{education_id}`
- `DELETE /education/{education_id}`

### Dashboard

- `GET /candidate/dashboard`
- `GET /companies/{company_id}/dashboard`
- `GET /jobs/{job_id}/dashboard`

### Analytics

- `GET /ai/dashboard/overview`
- `GET /ai/dashboard/company/{company_id}`
- `GET /ai/dashboard/job/{job_id}`
- `GET /ai/dashboard/candidate/{candidate_id}`
- `GET /ai/dashboard/trends`
- `GET /ai/dashboard/skills`
- `GET /ai/dashboard/export/{report_format}`

### AI

- `POST /ai/parse-resume`
- `POST /ai/extract-skills`
- `POST /ai/job-match`
- `POST /ai/recommendations`
- `POST /ai/rank-candidates`

### Job Categories and Saved Jobs

- `POST /job-categories`
- `GET /job-categories`
- `GET /job-categories/{category_id}`
- `PUT /job-categories/{category_id}`
- `DELETE /job-categories/{category_id}`
- `POST /saved-jobs`
- `GET /saved-jobs`
- `DELETE /saved-jobs/{job_id}`

## Future Improvements

- Add a dedicated application CRUD router if the product roadmap requires it
- Add email notifications and background job processing
- Add OAuth login providers
- Add real-time updates for hiring workflows
- Add additional AI explainability for matching and ranking

## License

MIT

## Author

SmartHire AI Contributors

## Manual Startup Script

Make sure PostgreSQL is running, then open two PowerShell terminals from the project root (`SmartHire-AI`).

### Terminal 1: Backend

```powershell
Set-Location .\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2: Frontend

```powershell
Set-Location .\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Open the app at `http://127.0.0.1:5173`.
