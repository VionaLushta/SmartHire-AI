from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

SortField = Literal["overall_score", "experience", "application_date", "candidate_name"]


@dataclass(frozen=True)
class RankingWeights:
    overall_ai_match: float = 0.50
    required_skills: float = 0.20
    experience: float = 0.15
    education: float = 0.10
    certification: float = 0.05


class CandidateRanker:
    """Ranks already-analyzed job applicants without changing their AI analysis."""

    def __init__(self, weights: RankingWeights | None = None) -> None:
        self.weights = weights or RankingWeights()

    def rank(
        self,
        candidates: list[dict],
        *,
        min_ai_score: float | None = None,
        min_experience: float | None = None,
        required_certification: str | None = None,
        required_degree: str | None = None,
        sort_by: SortField = "overall_score",
    ) -> list[dict]:
        filtered = [
            candidate
            for candidate in candidates
            if self._matches_filters(
                candidate,
                min_ai_score=min_ai_score,
                min_experience=min_experience,
                required_certification=required_certification,
                required_degree=required_degree,
            )
        ]
        ranked = [self._score(candidate) for candidate in filtered]
        ranked.sort(key=lambda candidate: self._sort_key(candidate, sort_by))

        for position, candidate in enumerate(ranked, start=1):
            candidate["rank"] = position
        return ranked

    def _matches_filters(
        self,
        candidate: dict,
        *,
        min_ai_score: float | None,
        min_experience: float | None,
        required_certification: str | None,
        required_degree: str | None,
    ) -> bool:
        if (
            min_ai_score is not None
            and self._number(candidate, "overall_ai_match") < min_ai_score
        ):
            return False
        if (
            min_experience is not None
            and self._number(candidate, "experience_years") < min_experience
        ):
            return False
        if required_certification and not self._contains(
            candidate.get("certifications", []), required_certification
        ):
            return False
        return not required_degree or self._contains(
            candidate.get("degrees", []), required_degree
        )

    def _score(self, candidate: dict) -> dict:
        score = int(
            self._number(candidate, "overall_ai_match") * self.weights.overall_ai_match
            + self._number(candidate, "required_skill_match")
            * self.weights.required_skills
            + self._number(candidate, "experience_match") * self.weights.experience
            + self._number(candidate, "education_match") * self.weights.education
            + self._number(candidate, "certification_match")
            * self.weights.certification
            + 0.5
        )
        return {
            "candidate_id": candidate["candidate_id"],
            "candidate_name": candidate["candidate_name"],
            "overall_score": max(0, min(100, score)),
            "required_skill_match": self._number(candidate, "required_skill_match"),
            "experience_match": self._number(candidate, "experience_match"),
            "education_match": self._number(candidate, "education_match"),
            "application_date": candidate["application_date"],
            "matched_skills": int(candidate.get("matched_skills", 0)),
            "missing_skills": int(candidate.get("missing_skills", 0)),
        }

    def _sort_key(self, candidate: dict, sort_by: SortField) -> tuple:
        tie_breakers = (
            -candidate["required_skill_match"],
            -candidate["experience_match"],
            -candidate["education_match"],
            candidate["application_date"],
        )
        if sort_by == "experience":
            return (
                -candidate["experience_match"],
                *tie_breakers,
                candidate["candidate_name"].lower(),
            )
        if sort_by == "application_date":
            return (
                -candidate["application_date"].timestamp(),
                *tie_breakers,
                candidate["candidate_name"].lower(),
            )
        if sort_by == "candidate_name":
            return (candidate["candidate_name"].lower(), *tie_breakers)
        return (
            -candidate["overall_score"],
            *tie_breakers,
            candidate["candidate_name"].lower(),
        )

    @staticmethod
    def _number(candidate: dict, field: str) -> float:
        value = candidate.get(field)
        return max(0.0, min(100.0, float(value or 0)))

    @staticmethod
    def _contains(values: list[str], required_value: str) -> bool:
        required = required_value.strip().casefold()
        return any(required in value.casefold() for value in values)
