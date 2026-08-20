from __future__ import annotations

import csv
import sys
import tempfile
from pathlib import Path

import pymupdf as fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services import ocr_pdf_parser
from app.services.resume_pipeline import process_resume_directory


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


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp_dir:
        upload_dir = Path(tmp_dir) / "uploads"
        upload_dir.mkdir()

        _create_pdf(
            upload_dir / "candidate_high.pdf",
            "Python FastAPI PostgreSQL Docker AWS microservices REST APIs",
        )
        _create_image(upload_dir / "candidate_medium.png")
        _create_image(upload_dir / "candidate_alt.jpg")
        (upload_dir / "candidate_corrupt.pdf").write_bytes(b"not a real pdf")

        def fake_easyocr(path):
            return None

        def fake_tesseract(path):
            if path.name == "candidate_medium.png":
                return "Excel SQL reporting stakeholder communication data visualization"
            if path.name == "candidate_alt.jpg":
                return "Python FastAPI PostgreSQL Docker AWS REST APIs"
            return ""

        original_easyocr = ocr_pdf_parser._extract_with_easyocr
        original_tesseract = ocr_pdf_parser._extract_with_pytesseract
        ocr_pdf_parser._extract_with_easyocr = fake_easyocr
        ocr_pdf_parser._extract_with_pytesseract = fake_tesseract
        try:
            report = process_resume_directory(
                upload_dir,
                _job_descriptions(),
                applications=[
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
                ],
                output_csv_path=upload_dir / "results.csv",
            )
        finally:
            ocr_pdf_parser._extract_with_easyocr = original_easyocr
            ocr_pdf_parser._extract_with_pytesseract = original_tesseract

        print("Pipeline results:")
        for item in report["results"]:
            print(item)
        print()
        print("Warnings:")
        for warning in report["warnings"]:
            print(warning)
        print()
        print(f"CSV generated: {report['csv_path']}")
        with Path(report["csv_path"]).open("r", encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
        print(f"CSV rows: {len(rows)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
