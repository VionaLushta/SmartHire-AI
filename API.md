# SmartHire AI API

This document is a route reference for the current FastAPI backend.

Base URL in development:

```text
http://127.0.0.1:8000
```

OpenAPI docs:

- `GET /docs`
- `GET /redoc`

## Authentication

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | No | Create a candidate account and return token data |
| POST | `/auth/login` | No | Authenticate a user |
| POST | `/auth/refresh` | No | Rotate a refresh token |
| POST | `/auth/logout` | No | Revoke a refresh token |
| GET | `/auth/me` | Yes | Return the current authenticated user |

## Candidate

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/candidate/profile` | Yes | Return the current candidate profile |
| PUT | `/candidate/profile` | Yes | Update the current candidate profile |
| GET | `/candidate/{candidate_id}` | Yes | Return a candidate profile by ID |
| GET | `/candidate/dashboard` | Yes | Return candidate dashboard metrics |

## Company

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/companies` | Yes | Create a company |
| GET | `/companies` | Yes | List companies with pagination |
| GET | `/companies/{company_id}` | Yes | Return company details |
| PUT | `/companies/{company_id}` | Yes | Update a company |
| DELETE | `/companies/{company_id}` | Yes | Delete a company |
| GET | `/companies/{company_id}/dashboard` | Yes | Return company dashboard metrics |

## Jobs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/jobs` | Yes | Create a job posting |
| GET | `/jobs` | Yes | List jobs with pagination |
| GET | `/jobs/{job_id}` | Yes | Return a job posting |
| PUT | `/jobs/{job_id}` | Yes | Update a job posting |
| DELETE | `/jobs/{job_id}` | Yes | Delete a job posting |
| GET | `/jobs/{job_id}/dashboard` | Yes | Return job-level dashboard metrics |

## Applications

The current backend does not expose a dedicated `/applications` router. Application data is currently surfaced through candidate, company, job, and analytics endpoints.

## Resume

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/resume/upload` | Yes | Upload a resume file |
| GET | `/resume` | Yes | List uploaded resumes |
| DELETE | `/resume/{resume_id}` | Yes | Delete a resume |

## Certificates

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/certificates` | Yes | Upload a certificate file |
| GET | `/certificates` | Yes | List certificates |
| DELETE | `/certificates/{cert_id}` | Yes | Delete a certificate |

## Education

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/education` | Yes | Create an education record |
| GET | `/education` | Yes | List education records |
| GET | `/education/{education_id}` | Yes | Return an education record |
| PUT | `/education/{education_id}` | Yes | Update an education record |
| DELETE | `/education/{education_id}` | Yes | Delete an education record |

## Departments

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/departments` | Yes | Create a department |
| GET | `/departments` | Yes | List departments |
| GET | `/departments/{department_id}` | Yes | Return a department |
| PUT | `/departments/{department_id}` | Yes | Update a department |
| DELETE | `/departments/{department_id}` | Yes | Delete a department |

## Job Categories

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/job-categories` | No | Create a job category |
| GET | `/job-categories` | No | List job categories |
| GET | `/job-categories/{category_id}` | No | Return a job category |
| PUT | `/job-categories/{category_id}` | No | Update a job category |
| DELETE | `/job-categories/{category_id}` | No | Delete a job category |

## Saved Jobs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/saved-jobs` | Yes | Save a job for the current user |
| GET | `/saved-jobs` | Yes | List saved jobs |
| DELETE | `/saved-jobs/{job_id}` | Yes | Remove a saved job |

## Analytics

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/ai/dashboard/overview` | Yes | Return platform overview metrics |
| GET | `/ai/dashboard/company/{company_id}` | Yes | Return company analytics |
| GET | `/ai/dashboard/job/{job_id}` | Yes | Return job analytics |
| GET | `/ai/dashboard/candidate/{candidate_id}` | Yes | Return candidate analytics |
| GET | `/ai/dashboard/trends` | Yes | Return trend data |
| GET | `/ai/dashboard/skills` | Yes | Return skills analytics |
| GET | `/ai/dashboard/export/{report_format}` | Yes | Export analytics data |

## AI

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/ai/parse-resume` | No | Parse a resume file into structured data |
| POST | `/ai/extract-skills` | No | Extract skills from raw text |
| POST | `/ai/job-match` | No | Compare an uploaded resume with a job ID |
| POST | `/ai/recommendations` | No | Generate job recommendations from a resume and job ID |
| POST | `/ai/rank-candidates` | Yes | Rank candidates for a job |

## Root

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | No | Return a basic health message |

## Notes

- List endpoints use the shared pagination helper and accept `skip` and `limit` query parameters.
- File upload routes use `multipart/form-data`.
- Protected routes rely on bearer tokens in the `Authorization` header.
- The application is intentionally organized around services and repositories, so route handlers stay thin.
