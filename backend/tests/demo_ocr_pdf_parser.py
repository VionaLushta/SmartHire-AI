from __future__ import annotations

import tempfile
import sys
from pathlib import Path

from PIL import Image, ImageDraw
import pymupdf as fitz

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.ocr_pdf_parser import (
    OCRProcessingError,
    extract_document_text,
)


def _create_demo_pdf(path: Path) -> None:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "SmartHire AI demo CV\nPython Developer")
    document.save(path)
    document.close()


def _create_demo_image(path: Path) -> None:
    image = Image.new("RGB", (360, 140), color="white")
    draw = ImageDraw.Draw(image)
    draw.text((16, 50), "Certificate: AWS Certified", fill="black")
    image.save(path)


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp_dir:
        base = Path(tmp_dir)
        pdf_path = base / "demo.pdf"
        image_path = base / "demo.png"

        _create_demo_pdf(pdf_path)
        _create_demo_image(image_path)

        print("PDF extraction:")
        print(extract_document_text(pdf_path))
        print()

        print("Image extraction:")
        try:
            print(extract_document_text(image_path))
        except OCRProcessingError as exc:
            print(f"OCR unavailable in this environment: {exc}")
            return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
