# API Documentation

## Conventions

- Base URL is defined by the deployment environment.
- Authentication uses JWT bearer tokens.
- Errors use consistent JSON responses with a `detail` field and validation errors when applicable.

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Authenticate user and issue tokens |
| POST | `/api/auth/refresh` | Rotate refresh token and issue a new access token |
| POST | `/api/auth/logout` | Revoke the refresh token |
| GET | `/api/auth/me` | Return current user profile |

### Example Response

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "token_type": "bearer"
}
```

## Candidate APIs

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/candidates/me` | Current candidate profile |
| PUT | `/api/candidates/me` | Update candidate profile |
| GET | `/api/candidate/dashboard` | Candidate dashboard summary |
| GET | `/api/candidate/applications` | Candidate applications |

## Company APIs

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/company/dashboard` | Company dashboard summary |
| GET | `/api/company/profile` | Company profile |
| PUT | `/api/company/profile` | Update company profile |

## Jobs APIs

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/jobs` | List jobs |
| POST | `/api/jobs` | Create job |
| GET | `/api/jobs/{job_id}` | Job details |
| PUT | `/api/jobs/{job_id}` | Update job |
| DELETE | `/api/jobs/{job_id}` | Delete job |
| GET | `/api/job-dashboard` | Recruiter job analytics |

## Resume and Certificate APIs

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/resume/upload` | Upload resume |
| GET | `/api/resume/me` | Current resume |
| POST | `/api/certificate/upload` | Upload certificate |

## Analytics and AI APIs

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/analytics/dashboard` | Analytics summary |
| GET | `/api/analytics/export` | Export analytics data |
| POST | `/api/ai/resume/analyze` | Analyze resume |
| POST | `/api/ai/resume/match` | Match resume to job |
| POST | `/api/ai/resume/recommendations` | Generate recommendations |
| GET | `/api/ai/dashboard/overview` | AI dashboard overview |

## Admin APIs

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/roles` | List roles |
| GET | `/api/admin/permissions` | List permissions |

## Response Errors

Validation failure example:

```json
{
  "detail": "Validation failed.",
  "errors": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

