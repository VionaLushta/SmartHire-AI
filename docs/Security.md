# Security Documentation

## Authentication

SmartHire AI uses JWT access tokens and refresh tokens. The backend validates:

- Missing tokens.
- Malformed tokens.
- Expired tokens.
- Invalid token types.
- Revoked refresh tokens.

## Role Permissions

Role-based authorization protects route and service access for:

- Admin.
- Recruiter.
- Company.
- Candidate.

The backend enforces permissions through dependencies, and the frontend protects routes through role-aware route guards.

## Validation

Input validation covers:

- Emails.
- Passwords.
- Phone numbers.
- URLs.
- Names.
- Text fields.

Request models reject malformed payloads before they reach business logic.

## Upload Security

Only approved document types are allowed:

- PDF.
- PNG.
- JPG.
- JPEG.

The upload pipeline also checks:

- File size limits.
- Extension validity.
- MIME type validity.
- Sanitized filenames.
- Known file signatures where possible.

## CORS

Cross-origin access is restricted to configured origins rather than wildcard access.

## Logging

Security-related events are logged, including:

- Failed login attempts.
- Unauthorized access.
- Invalid JWTs.
- Rejected uploads.
- Validation failures.
- Permission denials.

## Error Handling

Security-sensitive responses avoid exposing:

- Database internals.
- Stack traces.
- File system paths.
- Secrets.

