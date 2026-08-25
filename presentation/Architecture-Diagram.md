# SmartHire AI Architecture Diagram

## High-Level View

```text
        +--------------------+
        |    React Frontend   |
        |  Landing, Auth,     |
        |  Candidate, Company |
        |  Admin Dashboards   |
        +----------+---------+
                   |
                   | HTTPS / JSON
                   v
        +--------------------+
        |    FastAPI API     |
        |  Routes, Security, |
        |  Validation, Logs  |
        +----+----+----+-----+
             |    |    |
             |    |    +-------------------+
             |    |                        |
             v    v                        v
   +-------------------+         +-------------------+
   | Service Layer     |         | OCR / NLP / AI    |
   | Auth, Workflow,   |         | Matching, Skills, |
   | Email, PDF,       |         | Recommendations   |
   | Analytics, PowerBI|         +-------------------+
   +---------+---------+
             |
             v
   +-------------------+
   | Repository Layer  |
   | Database Access   |
   +---------+---------+
             |
             v
   +-------------------+
   |   PostgreSQL DB   |
   | Users, Jobs,      |
   | Resumes, Certs,   |
   | Applications, etc |
   +-------------------+
```

## Frontend

- React routes are lazy loaded.
- Protected routes restrict access by role.
- Shared layouts keep the UI consistent across auth and dashboard views.

## Backend

- FastAPI handles authentication, authorization, validation, and routing.
- Services contain the business rules.
- Repositories isolate data access.

## OCR, NLP, and AI Matching

- Resume documents are validated before processing.
- OCR extracts text from image-based files when needed.
- NLP normalizes and compares text for match scoring.
- Recommendation helpers generate recruiter-friendly guidance.

## Analytics and Power BI

- Analytics services summarize workflow and hiring data.
- Export services prepare data for downstream reporting tools, including Power BI.

## Database

- PostgreSQL stores the operational and workflow data.
- SQLAlchemy models keep the schema aligned with the application layer.

