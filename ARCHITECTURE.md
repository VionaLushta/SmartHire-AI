# SmartHire AI Architecture

This document describes the live architecture of the repository.

## System Overview

SmartHire AI uses a three-tier design:

```text
React 19 frontend -> FastAPI backend -> PostgreSQL database
```

- The frontend is a single-page app with protected routes, centralized state, and API services.
- The backend is organized around routers, services, repositories, and SQLAlchemy models.
- PostgreSQL stores the domain data and Alembic tracks schema changes.

## Frontend Architecture

### Stack

- React 19
- Vite
- Redux Toolkit
- React Router
- Axios
- Tailwind CSS

### Folder Responsibilities

- `src/routes` sets up route groups, bootstrapping, and access control.
- `src/layouts` defines the public and authenticated page shells.
- `src/pages` contains routed screens for landing, auth, candidate, company, admin, and error states.
- `src/components` contains reusable UI and feature components.
- `src/redux` contains the store and feature slices.
- `src/services` wraps API access and auth persistence.
- `src/context` provides theme and notification state.
- `src/utils` holds cross-cutting helpers.

### Frontend Data Flow

1. `AuthInitializer` boots the session on first render.
2. `authSlice` restores any persisted auth payload.
3. Feature thunks call service modules.
4. `src/services/api.js` attaches the bearer token and handles expiry events.
5. Slice reducers update view state and persist the latest auth payload.

## Backend Architecture

### Stack

- FastAPI
- SQLAlchemy 2.0
- Pydantic v2
- Alembic
- Uvicorn

### Folder Responsibilities

- `app/api` contains route handlers.
- `app/core` contains settings, shared dependencies, pagination, and security helpers.
- `app/database` manages the engine and session factory.
- `app/models` defines ORM entities.
- `app/schemas` defines request and response contracts.
- `app/services` contains business rules.
- `app/repositories` contains data-access classes.
- `app/ml` contains parsing, matching, ranking, and analytics helpers.
- `app/utils` contains shared utilities.

### Request Flow

1. A request enters a FastAPI router.
2. Dependencies resolve the database session and authenticated user.
3. The router delegates to a service class.
4. The service calls one or more repositories.
5. The repository talks to SQLAlchemy and PostgreSQL.
6. The service returns schema-validated output to the router.

## Database Layer

### Core Entities

- users
- roles
- permissions
- refresh_tokens
- candidates
- companies
- company_users
- departments
- jobs
- job_skills
- resumes
- resume_skills
- education
- certificates
- applications
- interviews
- trainings
- skills

### Migration Strategy

- Alembic stores the schema history in `backend/alembic/versions`.
- Migrations are applied with `alembic upgrade head`.
- New schema changes should be generated from the model layer and reviewed before deployment.

## Repository Pattern

- Repositories isolate read and write logic for a single domain.
- Services do not issue ad hoc queries directly.
- This keeps database concerns testable, reusable, and easy to evolve.
- It also helps keep the route layer thin and predictable.

## Service Layer

- Services hold domain rules and orchestration.
- They validate workflow-level assumptions that do not belong in the router.
- They coordinate between repositories and AI helpers when a request spans more than one concern.
- They are the right place for authorization-sensitive operations and derived calculations.

## Redux Flow

- `authSlice` manages session state, persistence, and bootstrap logic.
- `jobSlice`, `companySlice`, `candidateSlice`, and `applicationSlice` manage feature data.
- Async thunks call the service layer and keep networking out of components.
- Components subscribe to slice state and render based on status, errors, and records.

## Authentication Flow

1. The user submits credentials through the login form.
2. The backend validates the credentials and returns access and refresh tokens.
3. The frontend stores the session payload locally.
4. Requests include `Authorization: Bearer <token>`.
5. `ProtectedRoute` blocks unauthenticated access and checks the user role when needed.
6. A 401 or 403 response triggers session expiry handling on the frontend.

## AI Flow

### Resume Parsing

1. A resume is uploaded or passed to an AI route.
2. The backend extracts text and normalizes the content.
3. The skill extractor identifies candidate skills.
4. The parsed result is returned to the caller and can be reused by other services.

### Matching and Ranking

1. Job requirements are loaded from the database.
2. Candidate profile data is compared against the job profile.
3. The matcher and ranker compute match scores.
4. The API returns a score or a ranked list, depending on the route.

### Analytics

1. Service methods aggregate application and hiring records.
2. Analytics helpers prepare dashboard-ready summaries.
3. The export endpoint serializes the output into a report format.

## Deployment Notes

- Run migrations before starting the backend in a new environment.
- Set `VITE_API_URL` before building the frontend.
- Keep `.env` files out of version control.
- Use a managed PostgreSQL instance in production.
- Serve the backend behind a production ASGI server.

## Related Docs

- `README.md`
- `API.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
