from __future__ import annotations

import pytest

from app.services.nlp_matcher import (
    ALTERNATIVE_RECOMMENDATION_THRESHOLD,
    INTERVIEW_THRESHOLD,
    PRIMARY_MATCH_THRESHOLD,
    build_match_result,
    calculate_similarity,
    classify_match_status,
    find_best_alternative_match,
    find_primary_match,
    preprocess_text,
)


def test_preprocess_text_normalizes_content():
    assert preprocess_text("  Hello, WORLD! \nPython\tDeveloper.  ") == (
        "hello world python developer"
    )


def test_calculate_similarity_returns_percentage():
    score = calculate_similarity(
        "Python FastAPI PostgreSQL Docker AWS",
        "Python FastAPI PostgreSQL Docker AWS",
    )
    assert score == 100.0


def test_high_match_classification():
    applied_job = {
        "title": "Senior Python Backend Developer",
        "description": "Python FastAPI PostgreSQL Docker AWS microservices REST APIs",
        "is_open": True,
    }
    candidate_text = applied_job["description"]
    result = build_match_result(candidate_name="Amina Khan", candidate_text=candidate_text, applied_job=applied_job, all_jobs=[applied_job])

    assert result["primary_match"] >= INTERVIEW_THRESHOLD
    assert result["status"] == "Invited to Interview"
    assert result["applied_position"] == applied_job["title"]


def test_medium_match_classification():
    applied_job = {
        "title": "Data Analyst",
        "description": "Excel dashboards SQL reporting Power BI stakeholder communication",
        "is_open": True,
    }
    candidate_text = (
        "Data analyst with Excel dashboards, SQL reporting, stakeholder communication, "
        "and some Power BI exposure."
    )
    result = build_match_result(
        candidate_name="Sara Ahmed",
        candidate_text=candidate_text,
        applied_job=applied_job,
        all_jobs=[applied_job],
    )

    assert PRIMARY_MATCH_THRESHOLD <= result["primary_match"] < INTERVIEW_THRESHOLD
    assert result["status"] == "Under Review"


def test_alternative_role_recommendation():
    applied_job = {
        "title": "Finance Analyst",
        "description": "Budgeting forecasting invoices Excel reporting compliance",
        "is_open": True,
    }
    alternative_job = {
        "title": "Python Backend Developer",
        "description": "Python FastAPI PostgreSQL Docker AWS REST APIs",
        "is_open": True,
    }
    candidate_text = alternative_job["description"]
    result = build_match_result(
        candidate_name="Mina Ali",
        candidate_text=candidate_text,
        applied_job=applied_job,
        all_jobs=[applied_job, alternative_job],
    )

    assert result["primary_match"] < PRIMARY_MATCH_THRESHOLD
    assert result["secondary_match"] is not None
    assert result["secondary_match"] >= ALTERNATIVE_RECOMMENDATION_THRESHOLD
    assert result["secondary_position"] == alternative_job["title"]
    assert result["status"] == "Suggested for Alternative Role"


def test_rejected_candidate():
    applied_job = {
        "title": "Project Manager",
        "description": "Agile leadership roadmap delivery stakeholder management",
        "is_open": True,
    }
    unrelated_job = {
        "title": "Operations Coordinator",
        "description": "Logistics scheduling compliance support reporting",
        "is_open": True,
    }
    candidate_text = "Graphic designer branding illustration Photoshop visual identity."
    result = build_match_result(
        candidate_name="Omar Saleh",
        candidate_text=candidate_text,
        applied_job=applied_job,
        all_jobs=[applied_job, unrelated_job],
    )

    assert result["primary_match"] < PRIMARY_MATCH_THRESHOLD
    assert result["secondary_match"] is None or result["secondary_match"] < ALTERNATIVE_RECOMMENDATION_THRESHOLD
    assert result["status"] == "Rejected"


def test_find_primary_and_secondary_helpers():
    applied_job = {
        "title": "Cloud Engineer",
        "description": "AWS Docker Kubernetes Terraform Python",
        "is_open": True,
    }
    jobs = [
        applied_job,
        {
            "title": "Marketing Specialist",
            "description": "AWS Python cloud infrastructure automation",
            "is_open": True,
        },
    ]
    candidate_text = applied_job["description"]

    primary = find_primary_match(candidate_text, applied_job)
    secondary = find_best_alternative_match(candidate_text, jobs, applied_job)
    status = classify_match_status(primary["match_percentage"], secondary["match_percentage"])

    assert primary["job_title"] == "Cloud Engineer"
    assert primary["match_percentage"] >= INTERVIEW_THRESHOLD
    assert secondary["job_title"] == "Marketing Specialist"
    assert status == "Invited to Interview"
