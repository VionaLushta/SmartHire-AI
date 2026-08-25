# Monitoring

SmartHire AI production monitoring should focus on operational visibility, security, and fast incident triage.

## Application Logs

- Track normal request handling.
- Record startup and database connectivity checks.
- Keep service-level logs for major user actions.

## Error Logs

- Capture validation failures.
- Capture authentication and authorization failures.
- Capture unhandled exceptions with sanitized messages.

## Performance Logs

- Track request duration.
- Track major service execution times.
- Monitor long-running workflows such as OCR, AI matching, report generation, and export operations.

## Security Logs

- Failed login attempts.
- Invalid token usage.
- Permission denials.
- Rejected uploads.
- Admin audit log access.

## Operational Notes

- Centralize logs in the platform logging provider where possible.
- Add alerting for repeated 5xx responses or authentication spikes.
- Store uploads and generated files on durable storage.
