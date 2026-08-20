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


def evaluate_skill_match(
    candidate_text: str, skill_name: str
) -> dict[str, float | str]:
    """Classify how strongly a single skill appears in the candidate text."""
    candidate_norm = preprocess_text(candidate_text)
    skill_norm = preprocess_text(skill_name)
    if not candidate_norm or not skill_norm:
        return {"skill": skill_name, "status": "Missing", "match_score": 0.0}

    candidate_tokens = set(candidate_norm.split())
    skill_tokens = [token for token in skill_norm.split() if token]
    if not skill_tokens:
        return {"skill": skill_name, "status": "Missing", "match_score": 0.0}

    overlap = _token_coverage(skill_tokens, candidate_tokens)
    similarity = calculate_similarity(skill_name, candidate_text)
    exact_phrase = skill_norm in candidate_norm

    if exact_phrase or overlap >= 1.0 or similarity >= 70:
        return {
            "skill": skill_name,
            "status": "Detected",
            "match_score": round(max(similarity, overlap * 100), 1),
        }
    if overlap >= 0.5 or similarity >= 30:
        return {
            "skill": skill_name,
            "status": "Partial Match",
            "match_score": round(max(similarity, overlap * 100), 1),
        }
    return {
        "skill": skill_name,
        "status": "Missing",
        "match_score": round(similarity, 1),
    }


def build_skill_report(
    candidate_text: str, skills: Sequence[Mapping[str, Any]]
) -> dict[str, Any]:
    """Build a structured skill report for admin-defined job skills."""
    report: list[dict[str, Any]] = []
    detected: list[str] = []
    partial: list[str] = []
    missing: list[str] = []

    for skill in skills:
        skill_name = _skill_name(skill)
        evaluation = evaluate_skill_match(candidate_text, skill_name)
        item = {
            "skill_id": skill.get("skill_id"),
            "name": skill_name,
            "category": skill.get("category"),
            "is_required": bool(skill.get("is_required", True)),
            "status": evaluation["status"],
            "match_score": evaluation["match_score"],
        }
        report.append(item)
        if item["status"] == "Detected":
            detected.append(skill_name)
        elif item["status"] == "Partial Match":
            partial.append(skill_name)
        else:
            missing.append(skill_name)

    return {
        "report": report,
        "detected": detected,
        "partial": partial,
        "missing": missing,
        "required_coverage": _coverage(report, required=True),
        "optional_coverage": _coverage(report, required=False),
        "strengths": build_candidate_strengths(candidate_text, report),
        "gaps": build_candidate_gaps(report, candidate_text),
    }


def build_candidate_strengths(
    candidate_text: str, skill_report: Sequence[Mapping[str, Any]]
) -> list[str]:
    strengths: list[str] = []
    detected_required = [
        item["name"]
        for item in skill_report
        if item.get("is_required") and item.get("status") == "Detected"
    ]
    detected_optional = [
        item["name"]
        for item in skill_report
        if not item.get("is_required") and item.get("status") == "Detected"
    ]
    partial_matches = [
        item["name"] for item in skill_report if item.get("status") == "Partial Match"
    ]

    for skill in detected_required[:4]:
        strengths.append(f"Strong {skill} knowledge")
    for skill in detected_optional[:2]:
        strengths.append(f"Relevant {skill} exposure")
    if any(token in preprocess_text(candidate_text) for token in ("backend", "api", "developer", "engineer")):
        strengths.append("Relevant backend experience")
    if any(skill.casefold() in {"sql", "postgresql", "database"} for skill in detected_required + detected_optional):
        strengths.append("Good SQL knowledge")
    if "git" in preprocess_text(candidate_text):
        strengths.append("Git workflow detected")
    if partial_matches:
        strengths.append(f"Partial alignment seen for {partial_matches[0]}")
    return _dedupe_preserve_order(strengths) or [
        "The profile has a foundation to build on for this role."
    ]


def build_candidate_gaps(
    skill_report: Sequence[Mapping[str, Any]], candidate_text: str | None = None
) -> list[str]:
    gaps: list[str] = []
    for item in skill_report:
        if item.get("is_required") and item.get("status") == "Missing":
            gaps.append(f"{item['name']} missing")
    if not any(item.get("name") == "Docker" and item.get("status") != "Missing" for item in skill_report):
        gaps.append("Docker missing")
    if not any(item.get("name") == "Redis" and item.get("status") != "Missing" for item in skill_report):
        gaps.append("Redis missing")
    lowered = preprocess_text(candidate_text or "")
    if lowered and not any(token in lowered for token in ("cloud", "aws", "azure", "gcp")):
        gaps.append("Cloud technologies not detected")
    return _dedupe_preserve_order(gaps)


def score_job_fit(
    resume_similarity: float, required_coverage: float, optional_coverage: float
) -> float:
    """Combine NLP similarity with required and optional skill coverage."""
    score = (
        float(resume_similarity) * 0.4
        + float(required_coverage) * 0.4
        + float(optional_coverage) * 0.2
    )
    return round(max(0.0, min(100.0, score)), 1)


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


def _skill_name(skill: Mapping[str, Any]) -> str:
    for key in ("name", "skill_name", "label"):
        value = skill.get(key)
        if value:
            return str(value)
    return "Unknown Skill"


def _token_coverage(skill_tokens: Sequence[str], candidate_tokens: set[str]) -> float:
    if not skill_tokens:
        return 0.0
    matches = 0
    for token in skill_tokens:
        if token in candidate_tokens or token.rstrip("s") in candidate_tokens:
            matches += 1
    return matches / len(skill_tokens)


def _coverage(report: Sequence[Mapping[str, Any]], *, required: bool) -> float:
    relevant = [item for item in report if bool(item.get("is_required")) is required]
    if not relevant:
        return 0.0
    score = 0.0
    for item in relevant:
        if item.get("status") == "Detected":
            score += 100.0
        elif item.get("status") == "Partial Match":
            score += 50.0
    return round(score / len(relevant), 1)


def _dedupe_preserve_order(values: Sequence[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            ordered.append(value)
    return ordered
