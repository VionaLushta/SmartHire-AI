from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Mapping
from urllib.parse import urlparse

from fastapi import UploadFile

CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
MULTISPACE_RE = re.compile(r"\s+")
SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]+")
PHONE_RE = re.compile(r"^[0-9()+\-\s.]{7,30}$")

ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_DOCUMENT_MIME_TYPES = {
    "application/pdf": {".pdf"},
    "image/png": {".png"},
    "image/jpeg": {".jpg", ".jpeg"},
    "image/jpg": {".jpg", ".jpeg"},
}
DOCUMENT_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "application/pdf": (b"%PDF-",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/jpg": (b"\xff\xd8\xff",),
}


def clean_text(value: object, field_name: str, *, max_length: int | None = None) -> str:
    text = _coerce_text(value)
    if not text:
        raise ValueError(f"{field_name} is required.")
    if max_length is not None and len(text) > max_length:
        raise ValueError(f"{field_name} must be at most {max_length} characters long.")
    return text


def clean_optional_text(
    value: object,
    field_name: str,
    *,
    max_length: int | None = None,
) -> str | None:
    text = _coerce_text(value)
    if not text:
        return None
    if max_length is not None and len(text) > max_length:
        raise ValueError(f"{field_name} must be at most {max_length} characters long.")
    return text


def validate_password_strength(value: object) -> str:
    password = clean_text(value, "Password")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if any(char.isspace() for char in password):
        raise ValueError("Password cannot contain whitespace.")
    if (
        not any(char.isupper() for char in password)
        or not any(char.islower() for char in password)
        or not any(char.isdigit() for char in password)
    ):
        raise ValueError("Password must contain uppercase, lowercase, and number.")
    return password


def validate_phone_number(value: object) -> str | None:
    phone = clean_optional_text(value, "Phone number", max_length=30)
    if phone is None:
        return None
    if not PHONE_RE.fullmatch(phone):
        raise ValueError("Phone number is invalid.")
    digit_count = sum(1 for char in phone if char.isdigit())
    if digit_count < 7:
        raise ValueError("Phone number is invalid.")
    return phone


def validate_http_url(value: object, field_name: str) -> str | None:
    url = clean_optional_text(value, field_name, max_length=255)
    if url is None:
        return None
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{field_name} must be a valid URL.")
    return url


def sanitize_filename(filename: object) -> str:
    name = _coerce_text(filename)
    if not name:
        raise ValueError("Filename is required.")
    name = Path(name).name
    name = SAFE_FILENAME_RE.sub("_", name)
    name = name.strip("._")
    if not name or name in {".", ".."}:
        raise ValueError("Filename is invalid.")
    return name


def validate_document_upload(
    file: UploadFile,
    *,
    allowed_mime_types: Mapping[str, set[str]] = ALLOWED_DOCUMENT_MIME_TYPES,
    max_size_bytes: int = 10 * 1024 * 1024,
) -> str:
    filename = sanitize_filename(file.filename)
    extension = Path(filename).suffix.lower()
    content_type = (file.content_type or "").strip().lower()

    if content_type not in allowed_mime_types:
        raise ValueError("Unsupported file type.")

    allowed_extensions = allowed_mime_types[content_type]
    if extension not in allowed_extensions:
        raise ValueError("File extension does not match the uploaded content type.")

    size = _measure_file_size(file)
    if size > max_size_bytes:
        raise ValueError("File exceeds the maximum allowed size.")

    expected_signatures = DOCUMENT_SIGNATURES.get(content_type)
    if expected_signatures is not None:
        header = _read_file_header(file, max(len(signature) for signature in expected_signatures))
        if not any(header.startswith(signature) for signature in expected_signatures):
            raise ValueError("File signature is invalid.")

    return filename


def _coerce_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        text = value
    else:
        text = str(value)
    text = unicodedata.normalize("NFKC", text)
    text = CONTROL_CHARS_RE.sub("", text)
    text = MULTISPACE_RE.sub(" ", text).strip()
    return text


def _measure_file_size(file: UploadFile) -> int:
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    return size


def _read_file_header(file: UploadFile, length: int) -> bytes:
    file.file.seek(0)
    header = file.file.read(length)
    file.file.seek(0)
    return header
