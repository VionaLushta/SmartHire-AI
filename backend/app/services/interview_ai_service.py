from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
from typing import Any, Iterable, Literal, Mapping, Sequence

from fastapi import HTTPException, status
from pydantic import BaseModel, Field, field_validator
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.config import get_settings
from app.core.validation import clean_optional_text, clean_text
from app.ml.skill_extractor import SkillExtractor
from app.services.pdf_generator import build_letter_styles, build_body_paragraphs, build_bullet_list, build_separator
from app.services.nlp_matcher import preprocess_text

logger = logging.getLogger("smarthire.performance")

DifficultyLevel = Literal["Easy", "Medium", "Hard"]


class InterviewQuestion(BaseModel):
    category: str
    question: str
    reason: str
    difficulty: DifficultyLevel
    expected_skill: str
    evaluation_criteria: list[str]


class InterviewGuide(BaseModel):
    candidate_name: str | None = None
    job_title: str | None = None
    overall_match: float = Field(ge=0, le=100)
    interview_summary: str
    candidate_strengths: list[str]
    candidate_risks: list[str]
    recommended_focus_areas: list[str]
    overall_interview_plan: list[str]
    questions: list[InterviewQuestion]

    @field_validator("candidate_strengths", "candidate_risks", "recommended_focus_areas", "overall_interview_plan")
    @classmethod
    def validate_non_empty_lists(cls, value: list[str]) -> list[str]:
        return [item for item in value if str(item or "").strip()]


class InterviewGuideExportResult(BaseModel):
    file_path: str
    generated_at: datetime
    document_type: str = "Interview Guide"


@dataclass(frozen=True)
class _QuestionTemplate:
    category: str
    difficulty: DifficultyLevel
    question: str
    reason: str
    expected_skill_source: str
    evaluation_criteria: tuple[str, ...]


class InterviewAIService:
    def __init__(
        self,
        *,
        report_root: str | Path | None = None,
        skill_extractor: SkillExtractor | None = None,
    ) -> None:
        self.settings = get_settings()
        self.report_root = self._resolve_report_root(report_root)
        self.interview_root = self.report_root / "interview_guides"
        self.interview_root.mkdir(parents=True, exist_ok=True)
        self.skill_extractor = skill_extractor or SkillExtractor()
        self.styles = build_letter_styles()

    def generate_interview_guide(
        self,
        *,
        candidate_cv: str,
        job_description: str,
        ai_match_result: Mapping[str, Any],
        candidate_name: str | None = None,
        job_title: str | None = None,
        detected_skills: Sequence[str] | None = None,
        missing_skills: Sequence[str] | None = None,
        variant: int = 0,
    ) -> InterviewGuide:
        started = perf_counter()
        context = self._build_context(
            candidate_cv=candidate_cv,
            job_description=job_description,
            ai_match_result=ai_match_result,
            candidate_name=candidate_name,
            job_title=job_title,
            detected_skills=detected_skills,
            missing_skills=missing_skills,
            variant=variant,
        )
        guide = InterviewGuide(
            candidate_name=context["candidate_name"],
            job_title=context["job_title"],
            overall_match=context["overall_match"],
            interview_summary=context["summary"],
            candidate_strengths=context["strengths"],
            candidate_risks=context["risks"],
            recommended_focus_areas=context["focus_areas"],
            overall_interview_plan=context["plan"],
            questions=context["questions"],
        )
        logger.info(
            "interview guide generated candidate=%s job=%s questions=%s duration_ms=%.1f",
            guide.candidate_name or "Unknown",
            guide.job_title or "Unknown",
            len(guide.questions),
            (perf_counter() - started) * 1000,
        )
        return guide

    def regenerate_interview_guide(
        self,
        *,
        candidate_cv: str,
        job_description: str,
        ai_match_result: Mapping[str, Any],
        candidate_name: str | None = None,
        job_title: str | None = None,
        detected_skills: Sequence[str] | None = None,
        missing_skills: Sequence[str] | None = None,
        previous_variant: int = 0,
    ) -> InterviewGuide:
        return self.generate_interview_guide(
            candidate_cv=candidate_cv,
            job_description=job_description,
            ai_match_result=ai_match_result,
            candidate_name=candidate_name,
            job_title=job_title,
            detected_skills=detected_skills,
            missing_skills=missing_skills,
            variant=previous_variant + 1,
        )

    def export_interview_guide_pdf(
        self,
        guide: InterviewGuide,
        *,
        file_name: str | None = None,
    ) -> InterviewGuideExportResult:
        started = perf_counter()
        safe_name = self._slugify(
            file_name
            or f"{guide.candidate_name or 'candidate'}-{guide.job_title or 'interview'}-interview-guide"
        )
        output_path = self.interview_root / f"{safe_name}.pdf"
        output_path.parent.mkdir(parents=True, exist_ok=True)

        story: list[Any] = []
        story.append(Paragraph("SmartHire AI Interview Guide", self.styles["LetterTitle"]))
        subtitle = f"{guide.candidate_name or 'Candidate'} | {guide.job_title or 'Job'}"
        story.append(Paragraph(subtitle, self.styles["LetterSubtitle"]))
        story.append(Spacer(1, 4 * mm))
        story.append(build_separator())
        story.append(Paragraph("Interview Summary", self.styles["LetterSection"]))
        story.extend(build_body_paragraphs([guide.interview_summary], self.styles))

        story.append(Paragraph("Candidate Strengths", self.styles["LetterSection"]))
        story.append(build_bullet_list(guide.candidate_strengths, self.styles))
        story.append(Paragraph("Candidate Risks", self.styles["LetterSection"]))
        story.append(build_bullet_list(guide.candidate_risks, self.styles))
        story.append(Paragraph("Recommended Focus Areas", self.styles["LetterSection"]))
        story.append(build_bullet_list(guide.recommended_focus_areas, self.styles))
        story.append(Paragraph("Overall Interview Plan", self.styles["LetterSection"]))
        story.append(build_bullet_list(guide.overall_interview_plan, self.styles))

        question_rows = [["Category", "Difficulty", "Expected Skill", "Question"]]
        for question in guide.questions:
            question_rows.append(
                [
                    Paragraph(question.category, self.styles["LetterBody"]),
                    Paragraph(question.difficulty, self.styles["LetterBody"]),
                    Paragraph(question.expected_skill, self.styles["LetterBody"]),
                    Paragraph(question.question, self.styles["LetterBody"]),
                ]
            )

        question_table = Table(
            question_rows,
            colWidths=(32 * mm, 20 * mm, 34 * mm, 102 * mm),
            repeatRows=1,
        )
        question_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(Paragraph("Interview Questions", self.styles["LetterSection"]))
        story.append(question_table)

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=A4,
            leftMargin=16 * mm,
            rightMargin=16 * mm,
            topMargin=16 * mm,
            bottomMargin=16 * mm,
            title="SmartHire AI Interview Guide",
            author="SmartHire AI",
        )
        doc.build(story)

        logger.info(
            "interview guide pdf exported path=%s duration_ms=%.1f",
            output_path,
            (perf_counter() - started) * 1000,
        )
        return InterviewGuideExportResult(
            file_path=str(output_path),
            generated_at=datetime.now(timezone.utc),
        )

    def _build_context(
        self,
        *,
        candidate_cv: str,
        job_description: str,
        ai_match_result: Mapping[str, Any],
        candidate_name: str | None,
        job_title: str | None,
        detected_skills: Sequence[str] | None,
        missing_skills: Sequence[str] | None,
        variant: int,
    ) -> dict[str, Any]:
        candidate_text = clean_text(candidate_cv, "Candidate CV", max_length=200_000)
        job_text = clean_text(job_description, "Job description", max_length=200_000)
        candidate_name = clean_optional_text(candidate_name, "Candidate name", max_length=255)
        job_title = clean_optional_text(job_title, "Job title", max_length=255)
        ai_match = dict(ai_match_result or {})
        overall_match = self._float(ai_match.get("overall_match", ai_match.get("overall_score", 0)))
        candidate_skills = self._normalize_list(
            detected_skills or self.skill_extractor.extract(candidate_text)["skills"]
        )
        job_skills = self._normalize_list(self.skill_extractor.extract(job_text)["skills"])
        matched_skills = self._normalize_list(ai_match.get("matched_skills", []))
        missing = self._normalize_list(
            missing_skills
            or ai_match.get("missing_skills")
            or self._infer_missing_skills(candidate_skills, job_skills)
        )
        strengths = self._build_strengths(ai_match, candidate_skills, matched_skills, overall_match)
        risks = self._build_risks(ai_match, missing, candidate_skills, overall_match)
        focus_areas = self._build_focus_areas(missing, job_skills, candidate_skills, overall_match)
        summary = self._build_summary(
            candidate_name=candidate_name,
            job_title=job_title,
            overall_match=overall_match,
            strengths=strengths,
            risks=risks,
            focus_areas=focus_areas,
        )
        questions = self._build_questions(
            candidate_text=candidate_text,
            job_text=job_text,
            candidate_skills=candidate_skills,
            job_skills=job_skills,
            matched_skills=matched_skills,
            missing_skills=missing,
            overall_match=overall_match,
            job_title=job_title,
            variant=variant,
        )
        plan = self._build_plan(job_title, overall_match, missing, strengths)
        return {
            "candidate_name": candidate_name,
            "job_title": job_title,
            "overall_match": overall_match,
            "summary": summary,
            "strengths": strengths,
            "risks": risks,
            "focus_areas": focus_areas,
            "plan": plan,
            "questions": questions,
        }

    def _build_questions(
        self,
        *,
        candidate_text: str,
        job_text: str,
        candidate_skills: Sequence[str],
        job_skills: Sequence[str],
        matched_skills: Sequence[str],
        missing_skills: Sequence[str],
        overall_match: float,
        job_title: str | None,
        variant: int,
    ) -> list[InterviewQuestion]:
        primary_skill = self._pick(candidate_skills, 0, fallback="the candidate's core stack")
        secondary_skill = self._pick(candidate_skills, 1, fallback=primary_skill)
        job_skill = self._pick(job_skills, 0, fallback=primary_skill)
        missing_skill = self._pick(missing_skills, 0, fallback="the missing skill set")
        second_missing_skill = self._pick(missing_skills, 1, fallback=missing_skill)
        project_context = self._role_context(job_title or job_text)
        score_hint = "strong" if overall_match >= 75 else "moderate" if overall_match >= 60 else "limited"

        templates = self._question_templates(
            primary_skill=primary_skill,
            secondary_skill=secondary_skill,
            job_skill=job_skill,
            missing_skill=missing_skill,
            second_missing_skill=second_missing_skill,
            project_context=project_context,
            score_hint=score_hint,
        )

        selected = self._rotate_templates(templates, variant)
        questions = [
            InterviewQuestion(
                category=template.category,
                question=template.question,
                reason=template.reason,
                difficulty=template.difficulty,
                expected_skill=self._resolve_expected_skill(
                    template.expected_skill_source,
                    primary_skill,
                    secondary_skill,
                    job_skill,
                    missing_skill,
                    second_missing_skill,
                    project_context,
                ),
                evaluation_criteria=list(template.evaluation_criteria),
            )
            for template in selected
        ]
        return questions[:15]

    def _question_templates(
        self,
        *,
        primary_skill: str,
        secondary_skill: str,
        job_skill: str,
        missing_skill: str,
        second_missing_skill: str,
        project_context: str,
        score_hint: str,
    ) -> list[_QuestionTemplate]:
        return [
            _QuestionTemplate(
                category="Technical Questions",
                difficulty="Easy",
                question=f"Can you walk me through how you used {primary_skill} in a recent project?",
                reason="Anchors the interview in the candidate's strongest visible technical signal.",
                expected_skill_source="primary_skill",
                evaluation_criteria=(
                    "Clear explanation of hands-on use",
                    "Describes scope and ownership",
                    "Shows familiarity with practical application",
                ),
            ),
            _QuestionTemplate(
                category="Behavioral Questions",
                difficulty="Easy",
                question="Tell me about a time you had to learn a new tool quickly to keep a project moving.",
                reason="Checks learning agility and self-directed adaptation.",
                expected_skill_source="communication",
                evaluation_criteria=(
                    "Mentions the learning approach",
                    "Explains how the candidate handled pressure",
                    "Describes the outcome",
                ),
            ),
            _QuestionTemplate(
                category="Communication",
                difficulty="Easy",
                question="How do you explain technical work to a non-technical stakeholder?",
                reason="Evaluates communication clarity with cross-functional partners.",
                expected_skill_source="communication",
                evaluation_criteria=(
                    "Uses plain language",
                    "Shows empathy for non-technical audiences",
                    "Provides an example of stakeholder communication",
                ),
            ),
            _QuestionTemplate(
                category="Experience Validation",
                difficulty="Easy",
                question=f"Describe a project where you used {secondary_skill} and what part you personally owned.",
                reason="Validates the candidate's direct ownership of a relevant experience.",
                expected_skill_source="secondary_skill",
                evaluation_criteria=(
                    "States the candidate's role",
                    "Identifies measurable contribution",
                    "Shows enough detail to validate the claim",
                ),
            ),
            _QuestionTemplate(
                category="Culture Fit",
                difficulty="Easy",
                question="What kind of team environment helps you do your best work?",
                reason="Explores collaboration preferences and culture alignment.",
                expected_skill_source="culture",
                evaluation_criteria=(
                    "Describes collaboration style",
                    "Shows self-awareness",
                    "Matches the pace and culture of the team",
                ),
            ),
            _QuestionTemplate(
                category="Technical Questions",
                difficulty="Medium",
                question=f"How would you improve a {project_context} workflow using {job_skill}?",
                reason="Moves from recall into practical system thinking.",
                expected_skill_source="job_skill",
                evaluation_criteria=(
                    "Shows understanding of the problem space",
                    "Explains an implementable approach",
                    "Mentions tradeoffs or constraints",
                ),
            ),
            _QuestionTemplate(
                category="Problem Solving",
                difficulty="Medium",
                question=f"If a {project_context} issue appeared in production, how would you investigate it?",
                reason="Measures troubleshooting structure and calmness under pressure.",
                expected_skill_source="problem_solving",
                evaluation_criteria=(
                    "Starts with diagnosis",
                    "Outlines a step-by-step approach",
                    "Considers impact, logging, and rollback",
                ),
            ),
            _QuestionTemplate(
                category="Missing Skill Questions",
                difficulty="Medium",
                question=f"We did not detect strong evidence of {missing_skill}; how would you ramp up quickly if the role required it?",
                reason="Validates the candidate's ability to close a known skill gap.",
                expected_skill_source="missing_skill",
                evaluation_criteria=(
                    "Explains a concrete learning plan",
                    "Shows practical examples of self-study or prior ramp-up",
                    "Demonstrates ownership of the gap",
                ),
            ),
            _QuestionTemplate(
                category="Communication",
                difficulty="Medium",
                question="How do you keep recruiters, engineers, and managers aligned when priorities change?",
                reason="Checks stakeholder communication and expectation management.",
                expected_skill_source="communication",
                evaluation_criteria=(
                    "Describes cadence or communication method",
                    "Shows prioritization awareness",
                    "Includes a real example",
                ),
            ),
            _QuestionTemplate(
                category="Behavioral Questions",
                difficulty="Medium",
                question="Tell me about a time you had to work with incomplete requirements or ambiguous direction.",
                reason="Probes judgment and adaptability in uncertain conditions.",
                expected_skill_source="behavioral",
                evaluation_criteria=(
                    "Explains ambiguity clearly",
                    "Shows decision-making process",
                    "Reflects on the result",
                ),
            ),
            _QuestionTemplate(
                category="Technical Questions",
                difficulty="Hard",
                question=f"Compare {primary_skill} with an alternative approach and explain when you would choose each one.",
                reason="Tests depth of technical reasoning and tradeoff analysis.",
                expected_skill_source="primary_skill",
                evaluation_criteria=(
                    "Explains tradeoffs",
                    "Shows architectural judgment",
                    "Recognizes context-driven decisions",
                ),
            ),
            _QuestionTemplate(
                category="Problem Solving",
                difficulty="Hard",
                question=f"How would you design a solution for a {project_context} problem that must stay reliable under growth?",
                reason="Assesses system design thinking at the role's difficulty level.",
                expected_skill_source="system_design",
                evaluation_criteria=(
                    "Breaks the problem into components",
                    "Explains reliability concerns",
                    "Mentions scaling or maintainability",
                ),
            ),
            _QuestionTemplate(
                category="Missing Skill Questions",
                difficulty="Hard",
                question=f"Suppose the team needed strong hands-on use of {second_missing_skill} immediately; how would you contribute while closing the gap?",
                reason="Checks how the candidate handles a second visible gap in a realistic setting.",
                expected_skill_source="second_missing_skill",
                evaluation_criteria=(
                    "Shows a plan to contribute right away",
                    "Shows awareness of limits",
                    "Explains how the gap would be closed over time",
                ),
            ),
            _QuestionTemplate(
                category="Experience Validation",
                difficulty="Hard",
                question=f"What measurable outcome improved when you applied {job_skill} in your previous work?",
                reason="Confirms the candidate can connect experience to measurable impact.",
                expected_skill_source="job_skill",
                evaluation_criteria=(
                    "Provides metrics or outcomes",
                    "Explains the candidate's contribution",
                    "Shows business value",
                ),
            ),
            _QuestionTemplate(
                category="Culture Fit",
                difficulty="Hard",
                question="How do you handle disagreement when your preferred technical approach differs from the team's direction?",
                reason="Evaluates professionalism, flexibility, and alignment with team decision-making.",
                expected_skill_source="culture",
                evaluation_criteria=(
                    "Shows respect and openness",
                    "Describes how the disagreement was resolved",
                    "Balances conviction with collaboration",
                ),
            ),
        ]

    def _build_summary(
        self,
        *,
        candidate_name: str | None,
        job_title: str | None,
        overall_match: float,
        strengths: Sequence[str],
        risks: Sequence[str],
        focus_areas: Sequence[str],
    ) -> str:
        name = candidate_name or "The candidate"
        role = job_title or "the target role"
        strong_text = ", ".join(strengths[:2]) if strengths else "a few useful signals"
        risk_text = ", ".join(risks[:2]) if risks else "no immediate red flags"
        focus_text = ", ".join(focus_areas[:2]) if focus_areas else "validation of core fit"
        return (
            f"{name} shows an overall AI match of {overall_match:.1f}% for {role}. "
            f"Key strengths include {strong_text}, while the main interview risks are {risk_text}. "
            f"The interview should focus on {focus_text} and validate the candidate's hands-on depth."
        )

    def _build_strengths(
        self,
        ai_match_result: Mapping[str, Any],
        candidate_skills: Sequence[str],
        matched_skills: Sequence[str],
        overall_match: float,
    ) -> list[str]:
        strengths = self._normalize_list(ai_match_result.get("candidate_strengths", []))
        strengths.extend(f"Hands-on experience with {skill}" for skill in matched_skills[:3])
        strengths.extend(f"Detected skill: {skill}" for skill in candidate_skills[:2] if skill not in strengths)
        if overall_match >= 75:
            strengths.append("Strong overall alignment with the role")
        elif overall_match >= 60:
            strengths.append("Moderate alignment with room to validate depth")
        elif overall_match > 0:
            strengths.append("Some relevant signals that deserve interview validation")
        return self._dedupe(strengths)[:5] or ["The profile has a foundation worth exploring."]

    def _build_risks(
        self,
        ai_match_result: Mapping[str, Any],
        missing_skills: Sequence[str],
        candidate_skills: Sequence[str],
        overall_match: float,
    ) -> list[str]:
        risks = self._normalize_list(ai_match_result.get("candidate_risks", []))
        if missing_skills:
            risks.append(f"Potential gap in {missing_skills[0]}")
        if len(missing_skills) > 1:
            risks.append(f"Additional gap in {missing_skills[1]}")
        if overall_match < 60:
            risks.append("Overall match score suggests the candidate needs deeper validation")
        if not candidate_skills:
            risks.append("Limited explicit skill evidence detected in the CV")
        return self._dedupe(risks)[:5] or ["No material risk detected from the available signals."]

    def _build_focus_areas(
        self,
        missing_skills: Sequence[str],
        job_skills: Sequence[str],
        candidate_skills: Sequence[str],
        overall_match: float,
    ) -> list[str]:
        focus = list(missing_skills[:3])
        for skill in job_skills:
            if skill not in focus and skill not in candidate_skills:
                focus.append(skill)
            if len(focus) >= 3:
                break
        if overall_match < 70:
            focus.append("Role fit and hands-on depth")
        return self._dedupe(focus)[:5] or ["Validate core experience and communication."]

    def _build_plan(
        self,
        job_title: str | None,
        overall_match: float,
        missing_skills: Sequence[str],
        strengths: Sequence[str],
    ) -> list[str]:
        role = job_title or "the role"
        plan = [
            f"Open with a 5-minute candidate overview for {role}.",
            "Validate the strongest technical signals first.",
            f"Probe the main gaps: {', '.join(missing_skills[:2]) if missing_skills else 'no critical gaps detected'}.",
            "Use behavioral and communication questions to confirm collaboration style.",
            "Close with candidate questions and next-step expectations.",
        ]
        if overall_match >= 75:
            plan.insert(2, "Spend extra time on advanced technical depth and system tradeoffs.")
        elif overall_match < 60:
            plan.insert(2, "Spend more time validating the core fit before moving into advanced detail.")
        if strengths:
            plan.append(f"Anchor the discussion around {strengths[0].lower()}.")
        return plan

    def _infer_missing_skills(
        self, candidate_skills: Sequence[str], job_skills: Sequence[str]
    ) -> list[str]:
        candidate_lookup = {skill.casefold() for skill in candidate_skills}
        return [skill for skill in job_skills if skill.casefold() not in candidate_lookup]

    def _rotate_templates(
        self, templates: Sequence[_QuestionTemplate], variant: int
    ) -> list[_QuestionTemplate]:
        seed = abs(int(variant))
        ordered = list(templates)
        if not ordered:
            return []
        offset = seed % len(ordered)
        return ordered[offset:] + ordered[:offset]

    def _resolve_expected_skill(
        self,
        source: str,
        primary_skill: str,
        secondary_skill: str,
        job_skill: str,
        missing_skill: str,
        second_missing_skill: str,
        project_context: str,
    ) -> str:
        mapping = {
            "primary_skill": primary_skill,
            "secondary_skill": secondary_skill,
            "job_skill": job_skill,
            "missing_skill": missing_skill,
            "second_missing_skill": second_missing_skill,
            "communication": "Communication",
            "behavioral": "Behavioral Judgment",
            "problem_solving": "Problem Solving",
            "system_design": f"{project_context} System Design",
            "culture": "Culture Fit",
        }
        return mapping.get(source, source.replace("_", " ").title())

    def _role_context(self, text: str) -> str:
        lowered = preprocess_text(text)
        if any(term in lowered for term in ("frontend", "ui", "react", "vite", "css")):
            return "frontend"
        if any(term in lowered for term in ("backend", "api", "fastapi", "django", "microservice")):
            return "backend"
        if any(term in lowered for term in ("data", "analytics", "report", "power bi", "sql")):
            return "data"
        if any(term in lowered for term in ("devops", "cloud", "docker", "kubernetes")):
            return "cloud"
        if any(term in lowered for term in ("hr", "recruit", "talent", "hiring")):
            return "recruiting"
        return "role"

    def _pick(self, items: Sequence[str], index: int, *, fallback: str) -> str:
        values = self._normalize_list(items)
        if 0 <= index < len(values):
            return values[index]
        return fallback

    def _normalize_list(self, items: Iterable[Any]) -> list[str]:
        normalized: list[str] = []
        for item in items or []:
            text = clean_optional_text(item, "Interview assistant item", max_length=255)
            if text:
                normalized.append(text)
        return self._dedupe(normalized)

    def _dedupe(self, items: Iterable[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for item in items:
            key = item.casefold()
            if key in seen:
                continue
            seen.add(key)
            result.append(item)
        return result

    def _float(self, value: Any) -> float:
        try:
            return max(0.0, min(100.0, float(value)))
        except (TypeError, ValueError):
            return 0.0

    def _slugify(self, value: str) -> str:
        text = clean_text(value, "Filename", max_length=255)
        text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
        return text or "interview-guide"

    def _resolve_report_root(self, report_root: str | Path | None) -> Path:
        if report_root is not None:
            return Path(report_root)
        return Path(self.settings.report_folder)

