# Database Documentation

## Overview

SmartHire AI uses a relational database modeled with SQLAlchemy ORM classes. The schema centers on authentication, company and recruiter access, job management, candidate profiles, resume analysis, certificates, workflow history, and analytics records.

## Main Tables and Models

| Model | Purpose | Key Fields |
| --- | --- | --- |
| `users` | Core user account | `id`, `email`, `password_hash`, `full_name`, `phone`, `role_id` |
| `roles` | Role definitions | `id`, `name`, `description` |
| `permissions` | Fine-grained permissions | `id`, `name`, `description` |
| `role_permissions` | Role-to-permission mapping | `role_id`, `permission_id` |
| `refresh_tokens` | Refresh token lifecycle | `id`, `user_id`, `jti`, `expires_at`, `revoked_at` |
| `companies` | Company profile | `id`, `name`, `industry`, `website` |
| `company_users` | Company membership | `company_id`, `user_id` |
| `departments` | Department grouping | `id`, `company_id`, `name` |
| `jobs` | Job postings | `id`, `company_id`, `department_id`, `title`, `status` |
| `job_skills` | Job skill requirements | `job_id`, `skill_name`, `is_required` |
| `job_categories` | Job taxonomy | `id`, `name` |
| `saved_jobs` | Candidate saved jobs | `user_id`, `job_id` |
| `resumes` | Candidate resume record | `id`, `user_id`, `file_name`, `file_path` |
| `educations` | Education history | `id`, `resume_id`, `institution`, `degree` |
| `work_experiences` | Employment history | `id`, `resume_id`, `company`, `title` |
| `projects` | Resume projects | `id`, `resume_id`, `name` |
| `awards` | Resume awards | `id`, `resume_id`, `name` |
| `languages` | Language catalog | `id`, `name` |
| `user_languages` | Candidate language proficiency | `user_id`, `language_id`, `proficiency` |
| `certificates` | Uploaded certificates | `id`, `user_id`, `file_name`, `file_path` |
| `applications` | Job applications | `id`, `user_id`, `job_id`, `status` |
| `ai_analysis` | Resume matching output | `id`, `application_id`, `score`, `summary` |
| `recruiter_notes` | Internal recruiter notes | `id`, `application_id`, `note` |
| `notifications` | User notifications | `id`, `user_id`, `type`, `is_read` |
| `interviews` | Interview scheduling | `id`, `application_id`, `scheduled_at` |
| `trainings` | Internal training records | `id`, `name`, `description` |
| `training_enrollments` | Training assignments | `training_id`, `user_id`, `status` |

## Relationships

- One role can map to many users.
- One user can have many refresh tokens over time.
- One company can own many departments and jobs.
- One job can have many skills and many applications.
- One application can have analysis, recruiter notes, interviews, and notifications.
- One resume can have many education, experience, project, and award records.
- One user can own one or more uploaded artifacts such as resumes and certificates.

## Primary Keys

Most tables use a UUID or integer primary key named `id`. Junction tables use composite key pairs such as `role_id` plus `permission_id` or `company_id` plus `user_id`.

## Foreign Keys

Foreign keys enforce ownership and referential integrity across:

- User to role.
- User to company membership.
- Job to company and department.
- Resume to user.
- Certificate to user.
- Application to user and job.
- Analysis records to applications.

## Data Flow

1. The frontend submits validated forms or uploads.
2. FastAPI validates the request and calls the service layer.
3. The service layer creates or updates ORM entities.
4. The database persists the transaction.
5. Dashboard and analytics services read the same schema for reporting.

## Notes

- `SmartHireAI_ERD.drawio` contains the visual ERD source.
- Upload paths and report paths are controlled through environment variables.
- No sensitive secrets are stored in application tables.

