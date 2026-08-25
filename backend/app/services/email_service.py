from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formatdate, make_msgid, parseaddr
import logging
import re
import smtplib
import socket
import ssl
from pathlib import Path
from typing import Any, Callable, Mapping
from time import perf_counter

from app.core.config import get_settings
from app.services.pdf_generator import CompanyProfile, GeneratedDocumentResult, PdfGenerator
from app.templates.email_templates import (
    RenderedEmailTemplate,
    render_hold_email,
    render_interview_email,
    render_offer_email,
    render_rejection_email,
)

logger = logging.getLogger(__name__)

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


@dataclass(frozen=True)
class SMTPConfig:
    host: str
    port: int
    username: str
    password: str
    sender: str
    use_tls: bool = True


class EmailServiceError(RuntimeError):
    """Base exception for recruitment email failures."""


class EmailConfigurationError(EmailServiceError):
    """Raised when SMTP configuration is incomplete or invalid."""


class EmailValidationError(EmailServiceError):
    """Raised when an email address is invalid."""


class EmailAttachmentError(EmailServiceError):
    """Raised when the expected PDF attachment is missing."""


class EmailDeliveryError(EmailServiceError):
    """Raised when the SMTP server cannot deliver the email."""


@dataclass(frozen=True)
class EmailDeliveryResult:
    status: str
    recipient: str
    document: str
    timestamp: str
    message_id: str | None
    subject: str
    attachment: str

    def as_dict(self) -> dict[str, str | None]:
        return {
            "status": self.status,
            "recipient": self.recipient,
            "document": self.document,
            "timestamp": self.timestamp,
            "message_id": self.message_id,
            "subject": self.subject,
            "attachment": self.attachment,
        }


class EmailService:
    def __init__(
        self,
        settings: Any | None = None,
        *,
        report_root: str | Path | None = None,
        company_profile: CompanyProfile | Mapping[str, Any] | Any | None = None,
        smtp_factory: Callable[[str, int, float | None], smtplib.SMTP] | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        self.settings = settings or get_settings()
        self.smtp_factory = smtp_factory or smtplib.SMTP
        self.timeout_seconds = timeout_seconds
        self.smtp_config = self._build_smtp_config(self.settings)
        self.company_profile = self._resolve_company_profile(company_profile)
        self.pdf_generator = PdfGenerator(
            report_root=report_root or getattr(self.settings, "report_folder", None),
            company_profile=self.company_profile,
        )

    def send_offer_email(
        self,
        candidate: Any,
        job: Any,
        recruiter_name: str,
        *,
        expected_start_date=None,
        employment_type: str | None = None,
        department: str | None = None,
        work_location: str | None = None,
        acceptance_instructions=None,
        reference_number: str | None = None,
        issue_date=None,
        company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    ) -> dict[str, str | None]:
        candidate_name, candidate_email, applied_position = self._normalize_candidate_and_job(candidate, job)
        self._validate_recipient(candidate_email)
        company_profile = self._resolve_company_profile(company)
        document = self.pdf_generator.generate_offer_letter(
            candidate,
            job,
            recruiter_name,
            expected_start_date=expected_start_date,
            employment_type=employment_type,
            department=department,
            work_location=work_location,
            acceptance_instructions=acceptance_instructions,
            reference_number=reference_number,
            issue_date=issue_date,
            company=company_profile,
        )
        template = render_offer_email(
            candidate_name=candidate_name,
            applied_position=applied_position,
            recruiter_name=recruiter_name,
            company_name=company_profile.name,
            company_address=company_profile.address,
            company_email=company_profile.email,
            company_phone=company_profile.phone,
            company_website=company_profile.website,
        )
        return self._deliver(candidate_email, document, template)

    def send_interview_email(
        self,
        candidate: Any,
        job: Any,
        recruiter_name: str,
        *,
        interview_date=None,
        interview_time: str | None = None,
        interview_type: str | None = None,
        meeting_link: str | None = None,
        interviewer_name: str | None = None,
        preparation_instructions=None,
        reference_number: str | None = None,
        issue_date=None,
        company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    ) -> dict[str, str | None]:
        candidate_name, candidate_email, applied_position = self._normalize_candidate_and_job(candidate, job)
        self._validate_recipient(candidate_email)
        company_profile = self._resolve_company_profile(company)
        document = self.pdf_generator.generate_interview_letter(
            candidate,
            job,
            recruiter_name,
            interview_date=interview_date,
            interview_time=interview_time,
            interview_type=interview_type,
            meeting_link=meeting_link,
            interviewer_name=interviewer_name,
            preparation_instructions=preparation_instructions,
            reference_number=reference_number,
            issue_date=issue_date,
            company=company_profile,
        )
        template = render_interview_email(
            candidate_name=candidate_name,
            applied_position=applied_position,
            recruiter_name=recruiter_name,
            company_name=company_profile.name,
            company_address=company_profile.address,
            company_email=company_profile.email,
            company_phone=company_profile.phone,
            company_website=company_profile.website,
        )
        return self._deliver(candidate_email, document, template)

    def send_rejection_email(
        self,
        candidate: Any,
        job: Any,
        recruiter_name: str,
        *,
        reference_number: str | None = None,
        issue_date=None,
        company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    ) -> dict[str, str | None]:
        candidate_name, candidate_email, applied_position = self._normalize_candidate_and_job(candidate, job)
        self._validate_recipient(candidate_email)
        company_profile = self._resolve_company_profile(company)
        document = self.pdf_generator.generate_rejection_letter(
            candidate,
            job,
            recruiter_name,
            reference_number=reference_number,
            issue_date=issue_date,
            company=company_profile,
        )
        template = render_rejection_email(
            candidate_name=candidate_name,
            applied_position=applied_position,
            recruiter_name=recruiter_name,
            company_name=company_profile.name,
            company_address=company_profile.address,
            company_email=company_profile.email,
            company_phone=company_profile.phone,
            company_website=company_profile.website,
        )
        return self._deliver(candidate_email, document, template)

    def send_hold_email(
        self,
        candidate: Any,
        job: Any,
        recruiter_name: str,
        *,
        reference_number: str | None = None,
        issue_date=None,
        company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    ) -> dict[str, str | None]:
        candidate_name, candidate_email, applied_position = self._normalize_candidate_and_job(candidate, job)
        self._validate_recipient(candidate_email)
        company_profile = self._resolve_company_profile(company)
        document = self.pdf_generator.generate_hold_letter(
            candidate,
            job,
            recruiter_name,
            reference_number=reference_number,
            issue_date=issue_date,
            company=company_profile,
        )
        template = render_hold_email(
            candidate_name=candidate_name,
            applied_position=applied_position,
            recruiter_name=recruiter_name,
            company_name=company_profile.name,
            company_address=company_profile.address,
            company_email=company_profile.email,
            company_phone=company_profile.phone,
            company_website=company_profile.website,
        )
        return self._deliver(candidate_email, document, template)

    def _deliver(
        self,
        recipient: str,
        document: GeneratedDocumentResult,
        template: RenderedEmailTemplate,
    ) -> dict[str, str | None]:
        started = perf_counter()
        attachment_path = Path(document.file_path)
        if not attachment_path.exists():
            raise EmailAttachmentError(f"Attachment not found: {attachment_path}")

        message = self._build_message(recipient, document, template, attachment_path)
        timestamp = datetime.now(timezone.utc).isoformat()

        try:
            with self.smtp_factory(
                self.smtp_config.host,
                self.smtp_config.port,
                timeout=self.timeout_seconds,
            ) as smtp:
                if self.smtp_config.use_tls:
                    smtp.starttls(context=ssl.create_default_context())
                smtp.login(self.smtp_config.username, self.smtp_config.password)
                failures = smtp.send_message(message)
                if isinstance(failures, dict) and failures:
                    raise EmailDeliveryError(f"SMTP rejected recipients: {failures}")
        except smtplib.SMTPAuthenticationError as exc:
            logger.exception(
                "SMTP authentication failed recipient=%s document=%s timestamp=%s",
                recipient,
                document.document_type,
                timestamp,
            )
            raise EmailDeliveryError("SMTP authentication failed.") from exc
        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected) as exc:
            logger.exception(
                "SMTP connection failed recipient=%s document=%s timestamp=%s",
                recipient,
                document.document_type,
                timestamp,
            )
            raise EmailDeliveryError("SMTP connection failed.") from exc
        except (TimeoutError, socket.timeout) as exc:
            logger.exception(
                "SMTP timeout recipient=%s document=%s timestamp=%s",
                recipient,
                document.document_type,
                timestamp,
            )
            raise EmailDeliveryError("SMTP request timed out.") from exc
        except OSError as exc:
            logger.exception(
                "SMTP delivery error recipient=%s document=%s timestamp=%s",
                recipient,
                document.document_type,
                timestamp,
            )
            raise EmailDeliveryError("Unable to deliver email.") from exc

        message_id = message.get("Message-ID")
        logger.info(
            "Email delivered recipient=%s document=%s timestamp=%s status=sent duration_ms=%.1f",
            recipient,
            document.document_type,
            timestamp,
            (perf_counter() - started) * 1000,
        )
        return EmailDeliveryResult(
            status="sent",
            recipient=recipient,
            document=document.document_type,
            timestamp=timestamp,
            message_id=message_id,
            subject=template.subject,
            attachment=attachment_path.name,
        ).as_dict()

    def _build_message(
        self,
        recipient: str,
        document: GeneratedDocumentResult,
        template: RenderedEmailTemplate,
        attachment_path: Path,
    ) -> EmailMessage:
        msg = EmailMessage()
        msg["Subject"] = template.subject
        msg["From"] = self.smtp_config.sender
        msg["To"] = recipient
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid()
        msg.set_content(template.plain_text)
        msg.add_alternative(template.html_body, subtype="html")

        try:
            pdf_bytes = attachment_path.read_bytes()
        except OSError as exc:
            raise EmailAttachmentError(f"Unable to read attachment: {attachment_path}") from exc

        msg.add_attachment(
            pdf_bytes,
            maintype="application",
            subtype="pdf",
            filename=attachment_path.name,
        )
        return msg

    def _build_smtp_config(self, settings: Any) -> SMTPConfig:
        host = self._setting_value(settings, "smtp_host")
        port = self._setting_value(settings, "smtp_port")
        username = self._setting_value(settings, "smtp_username")
        password = self._setting_value(settings, "smtp_password")
        sender = self._setting_value(settings, "smtp_from")
        use_tls = bool(self._setting_value(settings, "smtp_use_tls", True))

        missing = [
            label
            for label, value in (
                ("SMTP_HOST", host),
                ("SMTP_PORT", port),
                ("SMTP_USERNAME", username),
                ("SMTP_PASSWORD", password),
                ("SMTP_FROM", sender),
            )
            if value in (None, "")
        ]
        if missing:
            raise EmailConfigurationError(
                f"Missing SMTP configuration: {', '.join(missing)}."
            )

        try:
            smtp_port = int(port)
        except (TypeError, ValueError) as exc:
            raise EmailConfigurationError("SMTP_PORT must be an integer.") from exc
        if smtp_port <= 0:
            raise EmailConfigurationError("SMTP_PORT must be a positive integer.")

        return SMTPConfig(
            host=str(host).strip(),
            port=smtp_port,
            username=str(username).strip(),
            password=str(password).strip(),
            sender=str(sender).strip(),
            use_tls=use_tls,
        )

    def _validate_recipient(self, email: str) -> None:
        if not self._is_valid_email(email):
            raise EmailValidationError(f"Invalid email address: {email}")

    def _is_valid_email(self, email: str) -> bool:
        name, address = parseaddr(email or "")
        return bool(address and EMAIL_PATTERN.match(address) and address == (address or "").strip())

    def _normalize_candidate_and_job(self, candidate: Any, job: Any) -> tuple[str, str, str]:
        candidate_name = self._pick_text(candidate, "candidate_name", "full_name", "name", default="")
        if not candidate_name:
            first_name = self._pick_text(candidate, "first_name", default="")
            last_name = self._pick_text(candidate, "last_name", default="")
            candidate_name = " ".join(part for part in [first_name, last_name] if part).strip()
        if not candidate_name:
            raise EmailValidationError("Candidate name is required.")

        candidate_email = self._pick_text(candidate, "candidate_email", "email", default="")
        if not candidate_email:
            raise EmailValidationError("Candidate email is required.")

        applied_position = self._pick_text(
            job,
            "applied_position",
            "job_title",
            "title",
            "position",
            "role",
            default="",
        )
        if not applied_position:
            raise EmailValidationError("Applied position is required.")

        return candidate_name, candidate_email, applied_position

    def _resolve_company_profile(
        self, company: CompanyProfile | Mapping[str, Any] | Any | None
    ) -> CompanyProfile:
        default = CompanyProfile()
        if company is None:
            return default
        if isinstance(company, CompanyProfile):
            return company
        return CompanyProfile(
            name=self._pick_text(company, "name", "company_name", default=default.name),
            address=self._pick_text(
                company, "address", "company_address", "mailing_address", default=default.address
            ),
            email=self._pick_text(
                company, "email", "company_email", "contact_email", default=default.email
            ),
            phone=self._pick_text(
                company, "phone", "company_phone", "contact_phone", default=default.phone
            ),
            website=self._pick_text(
                company, "website", "company_website", "contact_website", default=default.website
            ),
        )

    def _setting_value(self, settings: Any, name: str, default: Any = "") -> Any:
        if isinstance(settings, Mapping):
            return settings.get(name, default)
        return getattr(settings, name, default)

    def _pick_text(self, source: Any, *keys: str, default: str = "") -> str:
        for key in keys:
            value = self._get_value(source, key)
            if value is None:
                continue
            if isinstance(value, str):
                text = value.strip()
                if text:
                    return text
            else:
                text = str(value).strip()
                if text:
                    return text
        return default

    def _get_value(self, source: Any, key: str) -> Any:
        if source is None:
            return None
        if isinstance(source, Mapping):
            return source.get(key)
        return getattr(source, key, None)


def _default_service() -> EmailService:
    return EmailService()


def send_offer_email(*args: Any, **kwargs: Any) -> dict[str, str | None]:
    return _default_service().send_offer_email(*args, **kwargs)


def send_interview_email(*args: Any, **kwargs: Any) -> dict[str, str | None]:
    return _default_service().send_interview_email(*args, **kwargs)


def send_rejection_email(*args: Any, **kwargs: Any) -> dict[str, str | None]:
    return _default_service().send_rejection_email(*args, **kwargs)


def send_hold_email(*args: Any, **kwargs: Any) -> dict[str, str | None]:
    return _default_service().send_hold_email(*args, **kwargs)
