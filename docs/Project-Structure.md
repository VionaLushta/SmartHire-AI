# Project Structure

## Root

- `README.md` - project overview and quick start.
- `docs/` - formal project documentation.
- `backend/` - FastAPI application and business logic.
- `frontend/` - React client application.

## Major Folders

### `frontend/`

Contains the React interface, route definitions, reusable components, state management, pages, and static assets.

### `backend/`

Contains the FastAPI application, service layer, database models, schemas, ML helpers, templates, and tests.

### `backend/app/services/`

Contains business workflows such as authentication, resume processing, OCR, email, PDF generation, analytics, and Power BI preparation.

### `backend/app/ml/`

Contains skill extraction, matching, ranking, recommendation, and analytics helpers.

### `backend/tests/`

Contains backend unit and integration tests.

### `frontend/src/`

Contains pages, components, Redux state, routes, styles, and API integrations.

### `templates/`

Contains HTML or textual templates used by the backend for emails or documents when applicable.

### `uploads/`

Stores approved uploaded artifacts such as resumes and certificates.

### `reports/`

Stores generated PDFs, exports, and other report artifacts.

## Supporting Files

- `.env.example` files describe required environment variables.
- Build and dependency manifests define runtime configuration.
- ERD files document the database structure visually.

