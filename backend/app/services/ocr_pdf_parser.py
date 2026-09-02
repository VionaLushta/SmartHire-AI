from __future__ import annotations

import logging
import re
from zipfile import BadZipFile, ZipFile
from pathlib import Path
from typing import Iterable
from time import perf_counter


class DocumentProcessingError(Exception):
    """Base exception for document extraction failures."""


class MissingDocumentError(DocumentProcessingError):
    """Raised when the input file does not exist."""


class UnsupportedFileTypeError(DocumentProcessingError):
    """Raised when the input file extension is not supported."""


class CorruptedDocumentError(DocumentProcessingError):
    """Raised when a PDF or image cannot be parsed."""


class OCRProcessingError(DocumentProcessingError):
    """Raised when OCR cannot extract text from an image."""


SUPPORTED_PDF_EXTENSIONS = {".pdf"}
SUPPORTED_WORD_EXTENSIONS = {".docx"}
SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
SUPPORTED_EXTENSIONS = SUPPORTED_PDF_EXTENSIONS | SUPPORTED_WORD_EXTENSIONS | SUPPORTED_IMAGE_EXTENSIONS

_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
_MULTI_SPACES_RE = re.compile(r"[ \t\f\v]+")
logger = logging.getLogger("smarthire.performance")


def clean_extracted_text(text: str | None) -> str:
    """Normalize extracted text without doing NLP preprocessing."""
    if not text:
        return ""

    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    # Join words split at a line-ending hyphen while keeping normal paragraphs.
    normalized = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", normalized)
    normalized = _CONTROL_CHARS_RE.sub("", normalized)

    lines: list[str] = []
    blank_streak = 0
    for raw_line in normalized.split("\n"):
        line = _MULTI_SPACES_RE.sub(" ", raw_line).strip()
        if line:
            lines.append(line)
            blank_streak = 0
        else:
            blank_streak += 1
            if blank_streak == 1:
                lines.append("")

    cleaned = "\n".join(lines).strip()
    return re.sub(r"\n{3,}", "\n\n", cleaned)


def extract_text_from_docx(file_path: str | Path) -> str:
    """Extract paragraphs and table text from a DOCX without extra dependencies."""
    started = perf_counter()
    path = _ensure_path(file_path)
    _ensure_file_exists(path)
    _ensure_supported_extension(path, SUPPORTED_WORD_EXTENSIONS)

    try:
        from xml.etree import ElementTree

        with ZipFile(path) as archive:
            document_xml = archive.read("word/document.xml")
        root = ElementTree.fromstring(document_xml)
    except (BadZipFile, KeyError, ElementTree.ParseError) as exc:
        raise CorruptedDocumentError("The DOCX file appears to be corrupted.") from exc
    except Exception as exc:
        raise CorruptedDocumentError("Failed to read the DOCX file.") from exc

    namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    paragraphs: list[str] = []
    for paragraph in root.iter(f"{namespace}p"):
        value = "".join(node.text or "" for node in paragraph.iter(f"{namespace}t"))
        if value.strip():
            paragraphs.append(value)

    result = clean_extracted_text("\n".join(paragraphs))
    logger.info("docx text extracted filename=%s duration_ms=%.1f", path.name, (perf_counter() - started) * 1000)
    return result


def extract_text_from_pdf(file_path: str | Path) -> str:
    """Extract clean text from every page of a PDF."""
    started = perf_counter()
    path = _ensure_path(file_path)
    _ensure_file_exists(path)
    _ensure_supported_extension(path, SUPPORTED_PDF_EXTENSIONS)

    try:
        from PyPDF2 import PdfReader
        from PyPDF2.errors import PdfReadError
    except ImportError as exc:  # pragma: no cover - dependency guard
        raise DocumentProcessingError(
            "PyPDF2 is required for PDF extraction."
        ) from exc

    try:
        reader = PdfReader(str(path))
        pages: list[str] = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            pages.append(page_text)
    except PdfReadError as exc:
        raise CorruptedDocumentError("The PDF file appears to be corrupted.") from exc
    except Exception as exc:
        raise CorruptedDocumentError("Failed to read the PDF file.") from exc

    result = clean_extracted_text("\n".join(pages))
    logger.info("pdf text extracted filename=%s duration_ms=%.1f", path.name, (perf_counter() - started) * 1000)
    return result


def extract_text_from_image(file_path: str | Path) -> str:
    """Extract clean OCR text from an image file."""
    started = perf_counter()
    path = _ensure_path(file_path)
    _ensure_file_exists(path)
    _ensure_supported_extension(path, SUPPORTED_IMAGE_EXTENSIONS)

    errors: list[str] = []
    backend_available = False

    easyocr_text = _extract_with_easyocr(path)
    if easyocr_text is not None:
        backend_available = True
    if easyocr_text and easyocr_text.strip():
        result = clean_extracted_text(easyocr_text)
        logger.info("ocr text extracted backend=easyocr filename=%s duration_ms=%.1f", path.name, (perf_counter() - started) * 1000)
        return result
    if easyocr_text is not None:
        errors.append("EasyOCR returned no text.")

    pytesseract_text = _extract_with_pytesseract(path)
    if pytesseract_text is not None:
        backend_available = True
    if pytesseract_text and pytesseract_text.strip():
        result = clean_extracted_text(pytesseract_text)
        logger.info("ocr text extracted backend=pytesseract filename=%s duration_ms=%.1f", path.name, (perf_counter() - started) * 1000)
        return result
    if pytesseract_text is not None:
        errors.append("pytesseract returned no text.")

    if not backend_available:
        raise OCRProcessingError(
            "No OCR backend is available. Install EasyOCR or pytesseract with "
            "the required native dependencies."
        )
    raise OCRProcessingError(" ".join(errors))


def extract_document_text(file_path: str | Path) -> str:
    """Extract text from a supported PDF, DOCX, or image document."""
    started = perf_counter()
    path = _ensure_path(file_path)
    _ensure_file_exists(path)

    extension = path.suffix.lower()
    if extension in SUPPORTED_PDF_EXTENSIONS:
        result = extract_text_from_pdf(path)
        logger.info("document text extracted type=pdf filename=%s duration_ms=%.1f", path.name, (perf_counter() - started) * 1000)
        return result
    if extension in SUPPORTED_WORD_EXTENSIONS:
        result = extract_text_from_docx(path)
        logger.info("document text extracted type=docx filename=%s duration_ms=%.1f", path.name, (perf_counter() - started) * 1000)
        return result
    if extension in SUPPORTED_IMAGE_EXTENSIONS:
        result = extract_text_from_image(path)
        logger.info("document text extracted type=image filename=%s duration_ms=%.1f", path.name, (perf_counter() - started) * 1000)
        return result

    raise UnsupportedFileTypeError(
        f"Unsupported file extension '{extension or '[none]'}'. "
        f"Supported files: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
    )


def _extract_with_easyocr(path: Path) -> str | None:
    try:
        import easyocr
    except ImportError:
        return None

    try:
        import numpy as np
        from PIL import Image
    except ImportError as exc:  # pragma: no cover - dependency guard
        raise OCRProcessingError(
            "EasyOCR requires Pillow and NumPy to be installed."
        ) from exc

    try:
        reader = easyocr.Reader(["en"], gpu=False)
        with Image.open(path) as image:
            image_array = np.array(image.convert("RGB"))
        results = reader.readtext(image_array, detail=0, paragraph=True)
        return "\n".join(_flatten_text(results))
    except Exception:
        return ""


def _extract_with_pytesseract(path: Path) -> str | None:
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return None

    try:
        with Image.open(path) as image:
            text = pytesseract.image_to_string(image)
        return text or ""
    except Exception:
        return ""


def _flatten_text(items: Iterable[object]) -> list[str]:
    flattened: list[str] = []
    for item in items:
        if isinstance(item, str):
            flattened.append(item)
        elif isinstance(item, (list, tuple)) and item:
            flattened.extend(_flatten_text(item))
    return flattened


def _ensure_path(file_path: str | Path) -> Path:
    return Path(file_path)


def _ensure_file_exists(path: Path) -> None:
    if not path.exists():
        raise MissingDocumentError(f"File not found: {path}")
    if not path.is_file():
        raise MissingDocumentError(f"Not a file: {path}")


def _ensure_supported_extension(path: Path, supported: set[str]) -> None:
    extension = path.suffix.lower()
    if extension not in supported:
        raise UnsupportedFileTypeError(
            f"Unsupported file extension '{extension or '[none]'}'. "
            f"Supported files: {', '.join(sorted(supported))}."
        )
