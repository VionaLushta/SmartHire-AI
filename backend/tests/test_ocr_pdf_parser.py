from __future__ import annotations

from pathlib import Path

import pytest
from PIL import Image, ImageDraw
import pymupdf as fitz

from app.services import ocr_pdf_parser


def _create_sample_pdf(path: Path) -> None:
    document = fitz.open()
    page_one = document.new_page()
    page_one.insert_text((72, 72), "Hello   world\n\nCandidate CV")
    page_two = document.new_page()
    page_two.insert_text((72, 72), "Second page text.")
    document.save(path)
    document.close()


def _create_sample_image(path: Path) -> None:
    image = Image.new("RGB", (320, 120), color="white")
    draw = ImageDraw.Draw(image)
    draw.text((12, 40), "Sample OCR text", fill="black")
    image.save(path)


def test_clean_extracted_text():
    raw = "Hello   world\r\n\r\n\nThis\tis\x07 a   test.\n\n\nKeep punctuation!"
    cleaned = ocr_pdf_parser.clean_extracted_text(raw)
    assert cleaned == "Hello world\n\nThis is a test.\n\nKeep punctuation!"


def test_extract_text_from_pdf(tmp_path):
    pdf_path = tmp_path / "sample.pdf"
    _create_sample_pdf(pdf_path)

    text = ocr_pdf_parser.extract_text_from_pdf(pdf_path)

    assert "Hello world" in text
    assert "Candidate CV" in text
    assert "Second page text." in text


def test_extract_text_from_image_uses_fallback(monkeypatch, tmp_path):
    image_path = tmp_path / "sample.png"
    _create_sample_image(image_path)

    monkeypatch.setattr(
        ocr_pdf_parser, "_extract_with_easyocr", lambda path: ""
    )
    monkeypatch.setattr(
        ocr_pdf_parser, "_extract_with_pytesseract", lambda path: "OCR   text\n\nhere"
    )

    text = ocr_pdf_parser.extract_text_from_image(image_path)

    assert text == "OCR text\n\nhere"


def test_extract_document_text_dispatches(tmp_path, monkeypatch):
    pdf_path = tmp_path / "dispatch.pdf"
    image_path = tmp_path / "dispatch.png"
    _create_sample_pdf(pdf_path)
    _create_sample_image(image_path)

    monkeypatch.setattr(
        ocr_pdf_parser,
        "extract_text_from_pdf",
        lambda path: "pdf text",
    )
    monkeypatch.setattr(
        ocr_pdf_parser,
        "extract_text_from_image",
        lambda path: "image text",
    )

    assert ocr_pdf_parser.extract_document_text(pdf_path) == "pdf text"
    assert ocr_pdf_parser.extract_document_text(image_path) == "image text"


def test_unsupported_extension_raises(tmp_path):
    doc_path = tmp_path / "sample.txt"
    doc_path.write_text("plain text", encoding="utf-8")

    with pytest.raises(ocr_pdf_parser.UnsupportedFileTypeError):
        ocr_pdf_parser.extract_document_text(doc_path)


def test_missing_file_raises(tmp_path):
    missing_path = tmp_path / "missing.pdf"

    with pytest.raises(ocr_pdf_parser.MissingDocumentError):
        ocr_pdf_parser.extract_document_text(missing_path)


def test_corrupted_pdf_raises(tmp_path):
    bad_pdf = tmp_path / "corrupted.pdf"
    bad_pdf.write_bytes(b"not a real pdf")

    with pytest.raises(ocr_pdf_parser.CorruptedDocumentError):
        ocr_pdf_parser.extract_text_from_pdf(bad_pdf)
