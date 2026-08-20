from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Mapping, Sequence

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

PRIMARY_MATCH_THRESHOLD = 60.0
INTERVIEW_THRESHOLD = 75.0
ALTERNATIVE_RECOMMENDATION_THRESHOLD = 70.0

_PUNCTUATION_RE = re.compile(r"[^\w\s]")
_WHITESPACE_RE = re.compile(r"\s+")


def preprocess_text(text: str | None) -> str:
    """Lowercase, strip punctuation, and normalize whitespace."""
    if not text:
        return ""
    cleaned = text.casefold()
    cleaned = _PUNCTUATION_RE.sub(" ", cleaned)
    cleaned = _WHITESPACE_RE.sub(" ", cleaned)
    return cleaned.strip()


def calculate_similarity(job_description: str, candidate_text: str) -> float:
    """Return TF-IDF cosine similarity as a 0-100 percentage."""
    prepared_job = preprocess_text(job_description)
    prepared_candidate = preprocess_text(candidate_text)
    if not prepared_job or not prepared_candidate:
        return 0.0

    try:
        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform([prepared_job, prepared_candidate])
        score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    except ValueError:
        return 0.0
    return round(float(score) * 100, 1)


def find_primary_match(
    candidate_text: str, applied_job: Mapping[str, Any]
) -> dict[str, Any]:
    """Compare the candidate CV against the applied job."""
    job_title = _job_title(applied_job)
    job_description = _job_description(applied_job)
    match_percentage = calculate_similarity(job_description, candidate_text)
    return {
        "job_title": job_title,
        "match_percentage": match_percentage,
    }


def find_best_alternative_match(
    candidate_text: str,
    all_jobs: Sequence[Mapping[str, Any]],
    applied_job: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Find the highest-scoring open job other than the applied role."""
    best_job_title: str | None = None
    best_score = 0.0
    applied_key = _job_key(applied_job) if applied_job is not None else None

    for job in all_jobs:
        if not _is_open_job(job):
            continue
        if applied_key is not None and _job_key(job) == applied_key:
            continue
        job_title = _job_title(job)
        job_description = _job_description(job)
        if not job_title or not job_description:
            continue

        score = calculate_similarity(job_description, candidate_text)
        if score > best_score:
            best_score = score
            best_job_title = job_title

    return {
        "job_title": best_job_title,
        "match_percentage": round(best_score, 1),
    }


def classify_match_status(
    primary_match: float, secondary_match: float | None = None
) -> str:
    """Classify the candidate based on the configured score thresholds."""
    if primary_match >= INTERVIEW_THRESHOLD:
        return "Invited to Interview"
    if primary_match >= PRIMARY_MATCH_THRESHOLD:
        return "Under Review"
    if secondary_match is not None and secondary_match >= ALTERNATIVE_RECOMMENDATION_THRESHOLD:
        return "Suggested for Alternative Role"
    return "Rejected"


def build_match_result(
    candidate_name: str,
    candidate_text: str,
    applied_job: Mapping[str, Any],
    all_jobs: Sequence[Mapping[str, Any]],
) -> dict[str, Any]:
    """Build a structured match summary for later storage."""
    primary = find_primary_match(candidate_text, applied_job)
    secondary: dict[str, Any] | None = None
    if primary["match_percentage"] < PRIMARY_MATCH_THRESHOLD:
        secondary = find_best_alternative_match(candidate_text, all_jobs, applied_job)

    secondary_match = secondary["match_percentage"] if secondary else None
    return {
        "candidate_name": candidate_name,
        "applied_position": primary["job_title"],
        "primary_match": primary["match_percentage"],
        "secondary_position": secondary["job_title"] if secondary else None,
        "secondary_match": secondary_match,
        "status": classify_match_status(primary["match_percentage"], secondary_match),
        "primary_match_details": primary,
        "secondary_match_details": secondary,
    }


def build_match_result_from_document(
    candidate_name: str,
    document_path: str | Path,
    applied_job: Mapping[str, Any],
    all_jobs: Sequence[Mapping[str, Any]],
) -> dict[str, Any]:
    """Extract document text via the OCR/PDF parser and run the matcher."""
    candidate_text = extract_text_from_document(document_path)
    return build_match_result(candidate_name, candidate_text, applied_job, all_jobs)


def extract_text_from_document(file_path: str | Path) -> str:
    """Bridge to the OCR/PDF parser while keeping the matcher reusable."""
    from app.services.ocr_pdf_parser import extract_document_text

    return extract_document_text(file_path)


def _job_title(job: Mapping[str, Any]) -> str:
    for key in ("title", "job_title", "position", "name"):
        value = job.get(key)
        if value:
            return str(value)
    return "Unknown Position"


def _job_description(job: Mapping[str, Any]) -> str:
    for key in ("description", "job_description", "text", "summary"):
        value = job.get(key)
        if value:
            return str(value)
    return ""


def _is_open_job(job: Mapping[str, Any]) -> bool:
    if "is_open" in job:
        return bool(job["is_open"])
    if "status" in job:
        status = str(job["status"]).casefold()
        return status in {"open", "active", "published", "live"}
    return True


def _job_key(job: Mapping[str, Any] | None) -> tuple[str | None, str | None]:
    if job is None:
        return (None, None)
    for key in ("job_id", "id", "title", "job_title", "position", "name"):
        value = job.get(key)
        if value:
            return (key, str(value))
    return (None, _job_description(job) or None)
