from __future__ import annotations

import sys
import tempfile
from pathlib import Path

import pymupdf as fitz

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.nlp_matcher import build_match_result_from_document


def _create_sample_cv_pdf(path: Path) -> None:
    document = fitz.open()
    page = document.new_page()
    page.insert_text(
        (72, 72),
        "Python FastAPI PostgreSQL Docker AWS microservices REST APIs",
    )
    document.save(path)
    document.close()


def main() -> int:
    applied_job = {
        "title": "Senior Python Backend Developer",
        "description": "Python FastAPI PostgreSQL Docker AWS microservices REST APIs",
        "is_open": True,
    }
    alternative_job = {
        "title": "Product Analyst",
        "description": "Excel dashboards SQL reporting stakeholder communication",
        "is_open": True,
    }
    other_jobs = [applied_job, alternative_job]

    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = Path(tmp_dir) / "sample_cv.pdf"
        _create_sample_cv_pdf(pdf_path)

        result = build_match_result_from_document(
            candidate_name="Demo Candidate",
            document_path=pdf_path,
            applied_job=applied_job,
            all_jobs=other_jobs,
        )

    print("NLP matching demo:")
    print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
