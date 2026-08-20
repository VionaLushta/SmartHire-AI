from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

from app.services import nlp_matcher, ocr_pdf_parser
from app.services.ocr_pdf_parser import DocumentProcessingError

DEFAULT_RESULTS_CSV = "results.csv"
CSV_COLUMNS = [
    "Candidate ID",
    "Candidate Name",
    "Applied Position",
    "Primary Match Score",
    "Secondary Position",
    "Secondary Match Score",
    "Application Status",
    "Extraction Timestamp",
]


def load_job_descriptions(job_source: Sequence[Mapping[str, Any]] | str | Path) -> list[dict[str, Any]]:
    """Load job descriptions from Python dictionaries or a JSON file."""
    if isinstance(job_source, (str, Path)):
        path = Path(job_source)
        if path.exists():
            with path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
            if isinstance(payload, dict) and "jobs" in payload:
                payload = payload["jobs"]
            if not isinstance(payload, list):
                raise ValueError("Job JSON must contain a list of job descriptions.")
            return [dict(job) for job in payload]
        raise FileNotFoundError(f"Job description file not found: {path}")
    return [dict(job) for job in job_source]


def process_resume_directory(
    upload_dir: str | Path,
    job_source: Sequence[Mapping[str, Any]] | str | Path,
    *,
    applications: Sequence[Mapping[str, Any]] | None = None,
    output_csv_path: str | Path | None = None,
) -> dict[str, Any]:
    """Process every supported CV document in a directory."""
    directory = Path(upload_dir)
    if not directory.exists():
        raise FileNotFoundError(f"Upload directory not found: {directory}")
    if not directory.is_dir():
        raise NotADirectoryError(f"Upload path is not a directory: {directory}")

    jobs = load_job_descriptions(job_source)
    if not jobs:
        raise ValueError("At least one job description is required.")

    application_lookup = _application_lookup(applications or [])
    results: list[dict[str, Any]] = []
    warnings: list[str] = []

    for file_path in sorted(directory.iterdir()):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() not in ocr_pdf_parser.SUPPORTED_EXTENSIONS:
            warnings.append(f"Skipped unsupported file: {file_path.name}")
            continue

        metadata = _resolve_metadata(file_path, application_lookup)
        try:
            result = process_resume_file(
                file_path,
                jobs,
                candidate_id=metadata.get("candidate_id"),
                candidate_name=metadata.get("candidate_name"),
                applied_position=metadata.get("applied_position"),
            )
        except DocumentProcessingError as exc:
            warnings.append(f"Skipped {file_path.name}: {exc}")
            continue
        except Exception as exc:
            warnings.append(f"Skipped {file_path.name}: {exc}")
            continue

        results.append(result)

    csv_path = Path(output_csv_path) if output_csv_path is not None else directory / DEFAULT_RESULTS_CSV
    export_results_csv(results, csv_path)

    return {
        "results": results,
        "warnings": warnings,
        "csv_path": str(csv_path),
    }


def process_resume_file(
    file_path: str | Path,
    job_source: Sequence[Mapping[str, Any]] | str | Path,
    *,
    candidate_id: str | None = None,
    candidate_name: str | None = None,
    applied_position: str | None = None,
) -> dict[str, Any]:
    """Process one CV file and return a structured result dictionary."""
    path = Path(file_path)
    _validate_document_type(path)

    jobs = load_job_descriptions(job_source)
    applied_job = _resolve_applied_job(jobs, applied_position)
    if applied_job is None:
        raise ValueError("Unable to resolve an applied position for the candidate.")

    extracted_text = ocr_pdf_parser.clean_extracted_text(
        ocr_pdf_parser.extract_document_text(path)
    )
    if not extracted_text:
        raise DocumentProcessingError(f"No text could be extracted from {path.name}.")

    result = nlp_matcher.build_match_result(
        candidate_name=_candidate_name(candidate_name, path),
        candidate_text=extracted_text,
        applied_job=applied_job,
        all_jobs=jobs,
    )
    result.update(
        {
            "candidate_id": candidate_id or path.stem,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source_file": path.name,
        }
    )
    return result


def export_results_csv(
    results: Sequence[Mapping[str, Any]], output_csv_path: str | Path
) -> str:
    """Export structured match results to CSV."""
    path = Path(output_csv_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    rows = [_csv_row(result) for result in results]

    try:
        import pandas as pd
    except ImportError:
        pd = None

    if pd is not None:
        frame = pd.DataFrame(rows, columns=CSV_COLUMNS)
        frame.to_csv(path, index=False)
    else:
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=CSV_COLUMNS)
            writer.writeheader()
            writer.writerows(rows)

    return str(path)


def _validate_document_type(path: Path) -> None:
    if path.suffix.lower() not in ocr_pdf_parser.SUPPORTED_EXTENSIONS:
        raise ocr_pdf_parser.UnsupportedFileTypeError(
            f"Unsupported file extension '{path.suffix.lower() or '[none]'}'. "
            f"Supported files: {', '.join(sorted(ocr_pdf_parser.SUPPORTED_EXTENSIONS))}."
        )


def _application_lookup(
    applications: Sequence[Mapping[str, Any]]
) -> dict[str, dict[str, Any]]:
    lookup: dict[str, dict[str, Any]] = {}
    for application in applications:
        file_name = str(
            application.get("file_name")
            or application.get("filename")
            or application.get("source_file")
            or ""
        ).strip()
        stem = str(application.get("file_stem") or "").strip()
        if file_name:
            lookup[file_name.casefold()] = dict(application)
        if stem:
            lookup[stem.casefold()] = dict(application)
    return lookup


def _resolve_metadata(
    file_path: Path, application_lookup: Mapping[str, Mapping[str, Any]]
) -> dict[str, Any]:
    return dict(
        application_lookup.get(file_path.name.casefold())
        or application_lookup.get(file_path.stem.casefold())
        or {}
    )


def _resolve_applied_job(
    jobs: Sequence[Mapping[str, Any]], applied_position: str | None
) -> Mapping[str, Any] | None:
    if applied_position:
        target = applied_position.casefold().strip()
        for job in jobs:
            job_title = str(
                job.get("title")
                or job.get("job_title")
                or job.get("position")
                or job.get("name")
                or ""
            ).casefold().strip()
            if job_title == target:
                return job
    return jobs[0] if jobs else None


def _candidate_name(candidate_name: str | None, path: Path) -> str:
    if candidate_name:
        return candidate_name
    return path.stem.replace("_", " ").replace("-", " ").strip().title()


def _csv_row(result: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "Candidate ID": result.get("candidate_id"),
        "Candidate Name": result.get("candidate_name"),
        "Applied Position": result.get("applied_position"),
        "Primary Match Score": result.get("primary_match"),
        "Secondary Position": result.get("secondary_position"),
        "Secondary Match Score": result.get("secondary_match"),
        "Application Status": result.get("status"),
        "Extraction Timestamp": result.get("timestamp"),
    }
