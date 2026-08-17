from __future__ import annotations

import re
from dataclasses import dataclass
from difflib import SequenceMatcher


@dataclass(frozen=True)
class MatchWeights:
    required_skills: float = 0.45
    preferred_skills: float = 0.15
    experience: float = 0.20
    education: float = 0.10
    certification: float = 0.10


class JobMatcher:
    def __init__(self, weights: MatchWeights | None = None) -> None:
        self.weights = weights or MatchWeights()
        self.synonyms: dict[str, set[str]] = {
            "postgresql": {"sql", "database", "rdbms"},
            "sql": {"postgresql", "mysql", "sqlite", "database", "rdbms"},
            "fastapi": {"python backend", "backend", "api"},
            "docker": {"container", "containers", "devops"},
            "github": {"git", "version control"},
            "kubernetes": {"k8s", "containers", "devops"},
            "aws": {"amazon web services", "cloud"},
            "azure": {"cloud"},
            "google cloud": {"gcp", "cloud"},
            "python": {"backend", "automation", "scripting"},
        }

    @staticmethod
    def _normalize(value: str) -> str:
        return re.sub(r"\s+", " ", value.strip().lower())

    def _semantic_similarity(self, left: str, right: str) -> float:
        a = self._normalize(left)
        b = self._normalize(right)
        if not a or not b:
            return 0.0
        if a == b:
            return 1.0
        if b in self.synonyms.get(a, set()) or a in self.synonyms.get(b, set()):
            return 0.85
        if any(token in b for token in self.synonyms.get(a, set())) or any(
            token in a for token in self.synonyms.get(b, set())
        ):
            return 0.75
        return SequenceMatcher(None, a, b).ratio()

    def _best_score(self, item: str, choices: list[str]) -> float:
        if not choices:
            return 0.0
        return max(self._semantic_similarity(item, choice) for choice in choices)

    def score_bucket(
        self, candidate_items: list[str], job_items: list[str]
    ) -> tuple[int, list[str], list[str]]:
        if not job_items:
            return 100, [], []
        matches: list[str] = []
        missing: list[str] = []
        total = 0.0
        for job_item in job_items:
            score = self._best_score(job_item, candidate_items)
            total += score
            if score >= 0.60:
                matches.append(job_item)
            else:
                missing.append(job_item)
        return (
            round((total / len(job_items)) * 100),
            sorted(set(matches), key=str.lower),
            sorted(set(missing), key=str.lower),
        )

    def compare(
        self, candidate: dict[str, list[str]], job: dict[str, list[str] | str]
    ) -> dict[str, object]:
        candidate_skills = candidate.get("skills", [])
        job_required = job.get("required_skills", []) or []
        job_preferred = job.get("preferred_skills", []) or []
        candidate_education = candidate.get("education", [])
        candidate_experience = candidate.get("experience", [])
        candidate_certs = candidate.get("certifications", [])

        required_score, required_matches, required_missing = self.score_bucket(
            candidate_skills, job_required
        )
        preferred_score, _, _ = self.score_bucket(candidate_skills, job_preferred)
        experience_score = self._experience_score(
            candidate_experience, str(job.get("experience_level") or "")
        )
        education_score = self._education_score(
            candidate_education, str(job.get("education") or "")
        )
        certification_score = self._certification_score(candidate_certs, job_required)

        overall = round(
            (
                required_score * self.weights.required_skills
                + preferred_score * self.weights.preferred_skills
                + experience_score * self.weights.experience
                + education_score * self.weights.education
                + certification_score * self.weights.certification
            )
        )
        overall = max(0, min(100, overall))
        return {
            "overall_match": overall,
            "required_skill_match": required_score,
            "preferred_skill_match": preferred_score,
            "experience_match": experience_score,
            "education_match": education_score,
            "certification_match": certification_score,
            "matched_skills": required_matches,
            "missing_skills": required_missing,
        }

    def _experience_score(self, experience: list[str], experience_level: str) -> int:
        if not experience_level:
            return 50 if experience else 0
        joined = " ".join(experience).lower()
        level = experience_level.lower()
        mappings = {
            "entry": ["junior", "intern", "0-1", "fresh"],
            "junior": ["junior", "0-2", "entry"],
            "mid": ["mid", "intermediate", "2-5"],
            "senior": ["senior", "lead", "expert", "5+"],
        }
        for key, tokens in mappings.items():
            if key in level and any(token in joined for token in tokens):
                return 100
        return 60 if experience else 0

    def _education_score(self, education: list[str], education_requirement: str) -> int:
        if not education_requirement:
            return 100 if education else 50
        joined = " ".join(education).lower()
        req = education_requirement.lower()
        degree_map = {
            "phd": ["phd", "doctor"],
            "master": ["master", "msc", "m.sc"],
            "bachelor": ["bachelor", "bsc", "b.sc"],
            "associate": ["associate", "diploma", "college"],
        }
        for key, tokens in degree_map.items():
            if key in req and any(token in joined for token in tokens):
                return 100
        return 60 if education else 0

    def _certification_score(
        self, certifications: list[str], required_skills: list[str]
    ) -> int:
        if not certifications:
            return 0
        text = " ".join(certifications).lower()
        if any(skill.lower() in text for skill in required_skills):
            return 100
        return 60
