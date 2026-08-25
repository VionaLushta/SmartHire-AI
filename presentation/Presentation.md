# SmartHire AI Presentation

## Project Summary

SmartHire AI is a recruitment platform that helps candidates upload resumes, helps recruiters review applications, and helps companies visualize hiring activity through analytics and Power BI exports.

## Presentation Outline

### 1. Problem Statement

- Hiring teams spend too much time screening resumes manually.
- Candidates do not always receive fast, consistent feedback.
- Recruiters need a single system for profiles, matching, decisions, and reporting.

### 2. Project Goal

- Automate resume intake and analysis.
- Support recruiter workflow decisions.
- Keep candidate, company, and admin views organized.
- Provide analytics and reporting outputs for leadership review.

### 3. Architecture

- React frontend for routed user experiences.
- FastAPI backend for business logic and APIs.
- PostgreSQL for persistent data storage.
- OCR, NLP, AI matching, analytics, and Power BI export services in the backend.

### 4. Technology Stack

- Frontend: React, Vite, Redux Toolkit, React Router.
- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic.
- Data: PostgreSQL.
- AI and analytics: OCR parsing, TF-IDF matching, recommendation engine, export services.

### 5. System Workflow

- Candidate registers or logs in.
- Candidate uploads resume.
- OCR and parsing extract text and structure.
- NLP and matching score the profile against jobs.
- Recruiter reviews applications and makes a decision.
- The system generates PDFs, sends emails, and updates analytics.

### 6. AI Pipeline

- Document validation.
- OCR or PDF text extraction.
- Text normalization.
- Skill extraction.
- Job matching.
- Recommendation generation.
- Ranking and analytics.

### 7. OCR

- Supports PDF and image inputs.
- Normalizes extracted text for downstream matching.
- Uses OCR fallback when direct PDF text extraction is not enough.

### 8. Resume Matching

- Compares resume content to job requirements.
- Scores skills, experience, education, and certifications.
- Produces a structured match explanation.

### 9. Recruiter Workflow

- Recruiter reviews candidates from a protected dashboard.
- Recruiter decisions drive timeline updates, PDF generation, email, and analytics.

### 10. Power BI

- Exported analytics can feed business reporting dashboards.
- Supports CSV, JSON, or PostgreSQL-backed reporting flows.

### 11. Security

- JWT authentication.
- Role-based authorization.
- Input validation.
- File upload validation.
- CORS restrictions.
- Security event logging.

### 12. Performance

- Lazy-loaded frontend routes.
- Focused backend services.
- Reusable repositories and helpers.
- Lightweight analytics and export flows.

### 13. Future Improvements

- LLM-assisted resume analysis.
- Interview scheduling.
- Calendar integration.
- Multi-language parsing.
- Cloud storage and Docker deployment.

### 14. Demo

- Show the candidate experience first.
- Then show recruiter review and decisioning.
- Finish with analytics and Power BI output.

### 15. Conclusion

- SmartHire AI combines hiring workflow automation, document intelligence, and reporting in one production-ready platform.

