from datetime import datetime, timezone
from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from pydantic import ValidationError

from app.core.pagination import CollectionQuery, paginate
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.ml.analytics_engine import AnalyticsEngine
from app.ml.candidate_ranker import CandidateRanker
from app.ml.job_matcher import JobMatcher
from app.ml.recommendation_engine import RecommendationEngine
from app.ml.skill_extractor import SkillExtractor
from app.schemas.auth import RegisterRequest
from app.schemas.job import JobCreate
from app.services.certificate_service import CertificateService
from app.services.resume_service import ResumeService


@pytest.mark.parametrize(
    "text,skill",
    [
        ("Python FastAPI", "Python"),
        ("Docker and Kubernetes", "Docker"),
        ("PostgreSQL SQL", "PostgreSQL"),
        ("React TypeScript", "React"),
        ("AWS cloud", "AWS"),
        ("Agile teamwork", "Agile"),
    ],
)
def test_skill_extraction(text, skill):
    assert skill in SkillExtractor().extract(text)["skills"]


@pytest.mark.parametrize(
    "candidate,job,minimum",
    [
        (["Python"], ["Python"], 100),
        (["PostgreSQL"], ["SQL"], 60),
        (["Docker"], ["Kubernetes"], 0),
    ],
)
def test_job_matching(candidate, job, minimum):
    result = JobMatcher().score_bucket(candidate, job)
    assert result[0] >= minimum


@pytest.mark.parametrize(
    "sort_by", ["overall_score", "experience", "application_date", "candidate_name"]
)
def test_candidate_ranking(sort_by):
    candidates = [
        {
            "candidate_id": "1",
            "candidate_name": "Beta",
            "application_date": datetime(2026, 1, 2, tzinfo=timezone.utc),
            "overall_ai_match": 80,
            "required_skill_match": 80,
            "experience_match": 70,
            "education_match": 60,
            "certification_match": 50,
        },
        {
            "candidate_id": "2",
            "candidate_name": "Alpha",
            "application_date": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "overall_ai_match": 90,
            "required_skill_match": 90,
            "experience_match": 80,
            "education_match": 70,
            "certification_match": 60,
        },
    ]
    assert len(CandidateRanker().rank(candidates, sort_by=sort_by)) == 2


@pytest.mark.parametrize(
    "score,level", [(20, "Low"), (55, "Medium"), (75, "High"), (90, "Very High")]
)
def test_recommendation_hiring_probability(score, level):
    assert RecommendationEngine()._hiring_probability(score) == level


@pytest.mark.parametrize(
    "report_format,signature",
    [("json", b"{"), ("csv", b"section"), ("excel", b"PK"), ("pdf", b"%PDF")],
)
def test_analytics_exports(report_format, signature):
    content, _, _ = AnalyticsEngine().export(
        {"metrics": {"jobs": 1}, "funnel": []}, report_format
    )
    assert content.startswith(signature)


@pytest.mark.parametrize("page,page_size,expected", [(1, 2, [1, 2]), (2, 2, [3])])
def test_pagination(page, page_size, expected):
    query = CollectionQuery(page=page, page_size=page_size)
    assert paginate([1, 2, 3], query).items == expected


def test_password_hashing():
    hashed = hash_password("Password1")
    assert verify_password("Password1", hashed) and not verify_password("wrong", hashed)


def test_jwt_types():
    assert decode_token(create_access_token("user"))["type"] == "access"
    assert decode_token(create_refresh_token("user"))["type"] == "refresh"


def test_privileged_registration_rejected():
    with pytest.raises(ValidationError):
        RegisterRequest(
            first_name="A",
            last_name="B",
            email="test@example.com",
            password="Password1",
            role_name="Admin",
        )


def test_job_salary_validation():
    with pytest.raises(ValidationError):
        JobCreate(title="Role", company_id=1, salary_min=100, salary_max=50)


@pytest.mark.parametrize(
    "service,content_type",
    [
        (ResumeService.__new__(ResumeService), "application/pdf"),
        (CertificateService.__new__(CertificateService), "image/png"),
    ],
)
def test_upload_signature_rejected(service, content_type):
    upload = UploadFile(
        filename="bad",
        file=BytesIO(b"not-valid"),
        headers={"content-type": content_type},
    )
    with pytest.raises(HTTPException):
        service._validate_pdf(
            upload
        ) if content_type == "application/pdf" else service._validate_file(upload)


def test_test_database_fixture(test_db):
    assert test_db.bind is not None


def test_fastapi_startup(client):
    assert client.get("/openapi.json").status_code == 200
