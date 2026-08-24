from __future__ import annotations

from datetime import date
from pathlib import Path

from PyPDF2 import PdfReader

from app.services.pdf_generator import (
    generate_hold_letter,
    generate_interview_letter,
    generate_offer_letter,
    generate_rejection_letter,
)


def _sample_candidate() -> dict[str, str]:
    return {
        "first_name": "Viona",
        "last_name": "Lushta",
        "email": "viona.lushta@example.com",
    }


def _sample_job() -> dict[str, str]:
    return {
        "title": "Senior Backend Engineer",
        "employment_type": "Full-time",
        "department": "Engineering",
        "location": "Remote",
    }


def _assert_pdf_generated(path: str, expected_name: str, expected_text: str) -> None:
    pdf_path = Path(path)
    assert pdf_path.exists()
    assert pdf_path.name == expected_name
    assert pdf_path.suffix == ".pdf"
    assert pdf_path.stat().st_size > 0

    reader = PdfReader(str(pdf_path))
    assert reader.pages
    page_text = reader.pages[0].extract_text() or ""
    assert expected_text in page_text


def test_generate_offer_letter(tmp_path):
    result = generate_offer_letter(
        _sample_candidate(),
        _sample_job(),
        "Mia Carter",
        expected_start_date=date(2026, 9, 1),
        report_root=tmp_path,
    )

    _assert_pdf_generated(
        result.file_path,
        "Offer_Viona_Lushta.pdf",
        "Offer of Employment",
    )
    assert result.document_type == "Offer of Employment"
    assert result.generated_at is not None
    assert Path(result.file_path).parent.name == "offer_letters"


def test_generate_interview_letter(tmp_path):
    result = generate_interview_letter(
        _sample_candidate(),
        _sample_job(),
        "Mia Carter",
        interview_date=date(2026, 8, 30),
        interview_time="10:30 AM",
        interview_type="Online",
        meeting_link="https://meet.example.com/interview",
        interviewer_name="Ava Chen",
        report_root=tmp_path,
    )

    _assert_pdf_generated(
        result.file_path,
        "Interview_Viona_Lushta.pdf",
        "Interview Invitation",
    )
    assert result.document_type == "Interview Invitation"
    assert Path(result.file_path).parent.name == "interview_letters"


def test_generate_rejection_letter(tmp_path):
    result = generate_rejection_letter(
        _sample_candidate(),
        _sample_job(),
        "Mia Carter",
        report_root=tmp_path,
    )

    _assert_pdf_generated(
        result.file_path,
        "Rejection_Viona_Lushta.pdf",
        "Application Status Notice",
    )
    assert result.document_type == "Application Status Notice"
    assert Path(result.file_path).parent.name == "rejection_letters"


def test_generate_hold_letter(tmp_path):
    result = generate_hold_letter(
        _sample_candidate(),
        _sample_job(),
        "Mia Carter",
        report_root=tmp_path,
    )

    _assert_pdf_generated(
        result.file_path,
        "Hold_Viona_Lushta.pdf",
        "Application On Hold Notice",
    )
    assert result.document_type == "Application On Hold Notice"
    assert Path(result.file_path).parent.name == "hold_letters"

