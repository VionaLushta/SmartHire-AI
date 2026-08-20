from __future__ import annotations

import csv
from pathlib import Path

import pymupdf as fitz
import pytest
from PIL import Image

from app.services import ocr_pdf_parser
from app.services.resume_pipeline import process_resume_directory, process_resume_file


def _create_pdf(path: Path, text: str) -> None:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), text)
    document.save(path)
    document.close()


def _create_image(path: Path) -> None:
    image = Image.new("RGB", (300, 120), color="white")
    image.save(path)


def _job_descriptions() -> list[dict[str, str]]:
    return [
        {
            "title": "Finance Analyst",
            "description": "Budgeting forecasting invoices compliance risk reporting",
            "is_open": True,
        },
        {
            "title": "Data Analyst",
            "description": "Excel dashboards SQL reporting Power BI stakeholder communication data visualization",
            "is_open": True,
        },
        {
            "title": "Senior Python Backend Developer",
            "description": "Python FastAPI PostgreSQL Docker AWS microservices REST APIs",
            "is_open": True,
        },
        {
            "title": "Python Backend Developer",
            "description": "Python FastAPI PostgreSQL Docker AWS REST APIs",
            "is_open": True,
        },
    ]


def test_process_resume_directory_exports_csv(tmp_path, monkeypatch):
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()

    high_pdf = upload_dir / "candidate_high.pdf"
    medium_image = upload_dir / "candidate_medium.png"
    alt_image = upload_dir / "candidate_alt.jpg"
    corrupt_pdf = upload_dir / "candidate_corrupt.pdf"

    _create_pdf(high_pdf, "Python FastAPI PostgreSQL Docker AWS microservices REST APIs")
    _create_image(medium_image)
    _create_image(alt_image)
    corrupt_pdf.write_bytes(b"not a real pdf")

    def fake_easyocr(path):
        return None

    def fake_tesseract(path):
        if path.name == "candidate_medium.png":
            return "Excel SQL reporting stakeholder communication data visualization"
        if path.name == "candidate_alt.jpg":
            return "Python FastAPI PostgreSQL Docker AWS REST APIs"
        return ""

    monkeypatch.setattr(ocr_pdf_parser, "_extract_with_easyocr", fake_easyocr)
    monkeypatch.setattr(ocr_pdf_parser, "_extract_with_pytesseract", fake_tesseract)

    applications = [
        {
            "file_name": "candidate_high.pdf",
            "candidate_id": "C-001",
            "candidate_name": "Amina Khan",
            "applied_position": "Senior Python Backend Developer",
        },
        {
            "file_name": "candidate_medium.png",
            "candidate_id": "C-002",
            "candidate_name": "Sara Ahmed",
            "applied_position": "Data Analyst",
        },
        {
            "file_name": "candidate_alt.jpg",
            "candidate_id": "C-003",
            "candidate_name": "Mina Ali",
            "applied_position": "Finance Analyst",
        },
        {
            "file_name": "candidate_corrupt.pdf",
            "candidate_id": "C-004",
            "candidate_name": "Broken File",
            "applied_position": "Finance Analyst",
        },
    ]

    output_csv = tmp_path / "results.csv"
    report = process_resume_directory(
        upload_dir,
        _job_descriptions(),
        applications=applications,
        output_csv_path=output_csv,
    )

    assert len(report["results"]) == 3
    assert any("candidate_corrupt.pdf" in warning for warning in report["warnings"])
    assert Path(report["csv_path"]) == output_csv
    assert output_csv.exists()

    with output_csv.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))

    assert len(rows) == 3
    statuses = {row["Application Status"] for row in rows}
    assert "Invited to Interview" in statuses
    assert "Under Review" in statuses
    assert "Suggested for Alternative Role" in statuses


def test_process_resume_file_high_match_pdf(tmp_path, monkeypatch):
    pdf_path = tmp_path / "high_match.pdf"
    _create_pdf(pdf_path, "Python FastAPI PostgreSQL Docker AWS microservices REST APIs")

    jobs = _job_descriptions()
    result = process_resume_file(
        pdf_path,
        jobs,
        candidate_id="C-101",
        candidate_name="Demo Candidate",
        applied_position="Senior Python Backend Developer",
    )

    assert result["primary_match"] == 100.0
    assert result["status"] == "Invited to Interview"
    assert result["candidate_id"] == "C-101"


def test_process_resume_file_unsupported_extension(tmp_path):
    text_file = tmp_path / "notes.txt"
    text_file.write_text("plain text", encoding="utf-8")

    with pytest.raises(ocr_pdf_parser.UnsupportedFileTypeError):
        process_resume_file(
            text_file,
            _job_descriptions(),
            candidate_name="Text File",
            applied_position="Data Analyst",
        )
