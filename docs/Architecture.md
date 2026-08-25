# SmartHire AI Architecture

## Overview

SmartHire AI uses a React + Vite frontend and a FastAPI backend organized around route handlers, service classes, repositories, and ML helpers. The application keeps business logic in the backend services layer and uses the frontend primarily for presentation, routing, and state orchestration.

## Frontend Architecture

- React 19 with Vite as the build tool.
- React Router for page routing and protected route enforcement.
- Redux Toolkit for application state.
- Lazy-loaded major routes to reduce initial bundle cost.
- API access is centralized through Axios-based services.

### Frontend Flow

1. User opens a route in `frontend/src/routes/AppRouter.jsx`.
2. `ProtectedRoute.jsx` checks authentication state and allowed roles.
3. The selected page loads lazily through `React.lazy` and `Suspense`.
4. Page components call backend endpoints and render dashboards, forms, and reports.

## Backend Architecture

The backend follows a layered design:

- `app/api/` contains FastAPI routers.
- `app/services/` contains business workflows and integrations.
- `app/core/` contains configuration, authentication, authorization, dependency injection, and validation helpers.
- `app/models/` contains SQLAlchemy ORM models.
- `app/schemas/` contains Pydantic request and response models.
- `app/ml/` contains matching, ranking, recommendation, and analytics helpers.

### Backend Flow

1. FastAPI receives a request at an API route.
2. Dependencies resolve authentication and authorization.
3. Input is validated by Pydantic and shared validation helpers.
4. The service layer performs the business operation.
5. The response is serialized and returned through standardized error handling.

## Service Layer

The service layer encapsulates the main business capabilities:

- Authentication and refresh token lifecycle management.
- Resume and certificate upload validation.
- OCR and resume parsing.
- NLP and job matching.
- Recruitment workflow processing.
- PDF generation and email delivery.
- Analytics and Power BI export preparation.

## Database Layer

The database uses SQLAlchemy models with a relational schema around users, roles, permissions, companies, jobs, resumes, certificates, applications, workflows, and analytics artifacts. The data layer stores normalized entities and uses foreign keys for ownership, access control, and workflow tracking.

## Authentication

Authentication is JWT-based with access and refresh tokens. The backend validates missing, malformed, expired, revoked, and invalid token states and uses role-aware dependencies to protect routes.

## AI Modules

AI functionality is implemented through specialized helpers for:

- Skill extraction.
- Resume-job matching.
- Candidate ranking.
- Recommendation generation.
- Analytics aggregation.

## Workflow Engine

The recruitment workflow service coordinates the lifecycle from candidate upload through recruiter decisions, notifications, PDF generation, and analytics refresh.

## Power BI Integration

The analytics and Power BI services prepare exports and datasets for downstream reporting. The codebase supports tabular outputs that can be consumed by CSV, JSON, or database-backed reporting tools.

