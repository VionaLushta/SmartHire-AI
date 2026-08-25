from __future__ import annotations

from pathlib import Path

from app.services.interview_ai_service import InterviewAIService


def _ai_match_result() -> dict[str, object]:
    return {
        "overall_match": 78.5,
        "candidate_strengths": [
            "Strong Python experience",
            "FastAPI delivery",
            "Clear stakeholder communication",
        ],
        "candidate_risks": [
            "Limited React depth",
        ],
        "matched_skills": [
            "Python",
            "FastAPI",
            "PostgreSQL",
        ],
        "missing_skills": [
            "React",
            "Power BI",
            "Interview scheduling",
        ],
    }


def _candidate_cv() -> str:
    return (
        "Senior backend developer with Python, FastAPI, PostgreSQL, Docker, AWS, "
        "and stakeholder communication experience. Led delivery for APIs and hiring workflows."
    )


def _job_description() -> str:
    return (
        "We need a recruiter-facing engineer with React, FastAPI, PostgreSQL, Power BI, "
        "communication, and problem solving skills to support hiring workflow analytics."
    )


def test_generate_interview_guide_builds_full_question_set(tmp_path):
    service = InterviewAIService(report_root=tmp_path)

    guide = service.generate_interview_guide(
        candidate_cv=_candidate_cv(),
        job_description=_job_description(),
        ai_match_result=_ai_match_result(),
        candidate_name="Amina Khan",
        job_title="Senior Platform Engineer",
    )

    assert guide.candidate_name == "Amina Khan"
    assert guide.job_title == "Senior Platform Engineer"
    assert guide.overall_match == 78.5
    assert len(guide.questions) == 15
    assert guide.interview_summary
    assert guide.candidate_strengths
    assert guide.candidate_risks
    assert guide.recommended_focus_areas
    assert guide.overall_interview_plan

    difficulty_counts = {"Easy": 0, "Medium": 0, "Hard": 0}
    categories = set()
    for question in guide.questions:
        difficulty_counts[question.difficulty] += 1
        categories.add(question.category)
        assert question.question
        assert question.reason
        assert question.expected_skill
        assert question.evaluation_criteria

    assert difficulty_counts == {"Easy": 5, "Medium": 5, "Hard": 5}
    assert {
        "Technical Questions",
        "Behavioral Questions",
        "Problem Solving",
        "Communication",
        "Culture Fit",
        "Experience Validation",
        "Missing Skill Questions",
    }.issubset(categories)


def test_regenerate_interview_guide_changes_question_order(tmp_path):
    service = InterviewAIService(report_root=tmp_path)

    base_guide = service.generate_interview_guide(
        candidate_cv=_candidate_cv(),
        job_description=_job_description(),
        ai_match_result=_ai_match_result(),
        candidate_name="Amina Khan",
        job_title="Senior Platform Engineer",
        variant=0,
    )
    regenerated = service.regenerate_interview_guide(
        candidate_cv=_candidate_cv(),
        job_description=_job_description(),
        ai_match_result=_ai_match_result(),
        candidate_name="Amina Khan",
        job_title="Senior Platform Engineer",
        previous_variant=0,
    )

    assert base_guide.questions[0].question != regenerated.questions[0].question


def test_export_interview_guide_pdf_creates_file(tmp_path):
    service = InterviewAIService(report_root=tmp_path)

    guide = service.generate_interview_guide(
        candidate_cv=_candidate_cv(),
        job_description=_job_description(),
        ai_match_result=_ai_match_result(),
        candidate_name="Amina Khan",
        job_title="Senior Platform Engineer",
    )

    result = service.export_interview_guide_pdf(guide)

    file_path = Path(result.file_path)
    assert file_path.exists()
    assert file_path.suffix.lower() == ".pdf"
    assert file_path.read_bytes().startswith(b"%PDF")

