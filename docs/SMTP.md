# SMTP Documentation

## Purpose

SmartHire AI uses SMTP to send workflow emails such as interview notifications, offer letters, status updates, and rejection letters.

## Environment Variables

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_USE_TLS`

## Configuration

1. Set the SMTP variables in the backend environment file.
2. Ensure the mail server allows authenticated sending.
3. Verify the sender address matches the approved domain.

## Email Templates

Common email types include:

- Interview invitation.
- Offer letter.
- Rejection notice.
- Application status update.

## Workflow

1. The workflow service determines the email event.
2. The PDF generator creates any attachment that is required.
3. The email service sends the message and logs the result.

## Testing

- Use a development SMTP server for local verification.
- Confirm attachment delivery where applicable.
- Review logs for successful and rejected delivery attempts.

