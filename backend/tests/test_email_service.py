from __future__ import annotations

from datetime import date, datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.services.email_service import (
    EmailAttachmentError,
    EmailConfigurationError,
    EmailService,
    EmailValidationError,
)
from app.templates.email_templates import render_offer_email
from app.services.pdf_generator import GeneratedDocumentResult


def build_settings(tmp_path, **overrides):
    settings = {
        "smtp_host": "smtp.example.com",
        "smtp_port": 587,
        "smtp_username": "hr@example.com",
        "smtp_password": "secret",
        "smtp_from": "hr@example.com",
        "smtp_use_tls": True,
        "report_folder": str(tmp_path),
    }
    settings.update(overrides)
    return SimpleNamespace(**settings)


def sample_candidate(email: str = "viona.lushta@example.com"):
    return {
        "first_name": "Viona",
        "last_name": "Lushta",
        "email": email,
    }


def sample_job():
    return {
        "title": "Senior Backend Engineer",
        "employment_type": "Full-time",
        "department": "Engineering",
        "location": "Remote",
    }


def test_template_rendering_includes_branding():
    template = render_offer_email(
        candidate_name="Viona Lushta",
        applied_position="Senior Backend Engineer",
        recruiter_name="Mia Carter",
    )

    assert template.subject == "SmartHire AI | Offer of Employment - Viona Lushta"
    assert "SmartHire AI" in template.html_body
    assert "Hello Viona Lushta" in template.html_body
    assert "Senior Backend Engineer" in template.html_body


@pytest.mark.parametrize(
    "method_name, method_kwargs, expected_subject, expected_attachment, expected_fragment, expected_document",
    [
        (
            "send_offer_email",
            {"expected_start_date": date(2026, 9, 1)},
            "SmartHire AI | Offer of Employment - Viona Lushta",
            "Offer_Viona_Lushta.pdf",
            "formal offer for the Senior Backend Engineer position",
            "Offer of Employment",
        ),
        (
            "send_interview_email",
            {
                "interview_date": date(2026, 8, 30),
                "interview_time": "10:30 AM",
                "interview_type": "Online",
                "meeting_link": "https://meet.example.com/interview",
                "interviewer_name": "Ava Chen",
            },
            "SmartHire AI | Interview Invitation - Viona Lushta",
            "Interview_Viona_Lushta.pdf",
            "next stage of the hiring process",
            "Interview Invitation",
        ),
        (
            "send_rejection_email",
            {},
            "SmartHire AI | Application Status Notice - Viona Lushta",
            "Rejection_Viona_Lushta.pdf",
            "move forward with another candidate",
            "Application Status Notice",
        ),
        (
            "send_hold_email",
            {},
            "SmartHire AI | Application On Hold - Viona Lushta",
            "Hold_Viona_Lushta.pdf",
            "remains under review",
            "Application On Hold Notice",
        ),
    ],
)
def test_email_service_sends_html_email_with_attachment(
    tmp_path,
    method_name,
    method_kwargs,
    expected_subject,
    expected_attachment,
    expected_fragment,
    expected_document,
):
    with patch("app.services.email_service.smtplib.SMTP") as mock_smtp:
        service = EmailService(settings=build_settings(tmp_path), report_root=tmp_path, smtp_factory=mock_smtp)
        smtp = mock_smtp.return_value.__enter__.return_value
        smtp.send_message.return_value = {}

        result = getattr(service, method_name)(
            sample_candidate(),
            sample_job(),
            "Mia Carter",
            **method_kwargs,
        )

        mock_smtp.assert_called_once_with("smtp.example.com", 587, timeout=30.0)
        smtp.starttls.assert_called_once()
        smtp.login.assert_called_once_with("hr@example.com", "secret")
        smtp.send_message.assert_called_once()

        message = smtp.send_message.call_args.args[0]
        assert message["To"] == "viona.lushta@example.com"
        assert message["Subject"] == expected_subject

        attachments = list(message.iter_attachments())
        assert len(attachments) == 1
        assert attachments[0].get_filename() == expected_attachment

        html_body = message.get_body(preferencelist=("html",))
        assert html_body is not None
        rendered_html = html_body.get_content()
        assert "SmartHire AI" in rendered_html
        assert expected_fragment in rendered_html

        assert result["status"] == "sent"
        assert result["recipient"] == "viona.lushta@example.com"
        assert result["document"] == expected_document
        assert result["attachment"] == expected_attachment
        assert result["message_id"]


def test_missing_attachment_raises(tmp_path):
    with patch("app.services.email_service.smtplib.SMTP") as mock_smtp:
        service = EmailService(settings=build_settings(tmp_path), report_root=tmp_path, smtp_factory=mock_smtp)
        missing = GeneratedDocumentResult(
            file_path=str(tmp_path / "missing.pdf"),
            generated_at=datetime.now(timezone.utc),
            document_type="Offer of Employment",
        )

        service.pdf_generator.generate_offer_letter = lambda *args, **kwargs: missing  # type: ignore[method-assign]

        with pytest.raises(EmailAttachmentError):
            service.send_offer_email(sample_candidate(), sample_job(), "Mia Carter")
        mock_smtp.assert_not_called()


def test_missing_smtp_configuration_raises(tmp_path):
    bad_settings = build_settings(
        tmp_path,
        smtp_host="",
    )

    with pytest.raises(EmailConfigurationError):
        EmailService(settings=bad_settings, report_root=tmp_path)


def test_invalid_recipient_email_raises(tmp_path):
    service = EmailService(settings=build_settings(tmp_path), report_root=tmp_path)

    with pytest.raises(EmailValidationError):
        service.send_offer_email(sample_candidate("not-an-email"), sample_job(), "Mia Carter")
