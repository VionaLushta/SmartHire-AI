# SmartHire AI Database Overview

## Main Entities

- Users
- Roles
- Permissions
- Companies
- Departments
- Jobs
- Job skills
- Resumes
- Certificates
- Applications
- AI analysis records
- Notifications
- Interviews
- Refresh tokens

## Relationship Summary

- Users belong to roles.
- Companies contain departments and jobs.
- Jobs collect skill requirements and applications.
- Resumes and certificates belong to users.
- Applications connect candidates to jobs.
- AI analysis records belong to applications.
- Notifications and interviews are tied to the workflow.
- Refresh tokens support secure session rotation.

## Data Flow

1. Candidate data enters through registration, profile updates, and uploads.
2. Company and recruiter data enters through protected administrative actions.
3. The workflow service writes application decisions and events.
4. Analytics and reporting services read operational tables for dashboards and exports.

## Practical Notes

- Use foreign keys to preserve referential integrity.
- Use indexes for common lookup paths such as user, job, company, and application references.
- Keep sensitive authentication data isolated from reporting exports.

