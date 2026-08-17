from __future__ import annotations

import re


class RecommendationEngine:
    """Builds explainable career guidance from a completed candidate-job match."""

    _learning_catalog: dict[str, tuple[str, str, int, int]] = {
        "aws": ("AWS Cloud Practitioner", "Certification", 4, 2),
        "azure": ("Azure Fundamentals", "Certification", 4, 2),
        "google cloud": ("Google Cloud Digital Leader", "Certification", 4, 2),
        "docker": ("Docker Fundamentals", "Course and hands-on project", 6, 1),
        "kubernetes": ("Kubernetes Basics", "Training and deployment project", 4, 2),
        "sql": (
            "Advanced SQL Practice",
            "Course and query-optimization exercises",
            4,
            1,
        ),
        "postgresql": (
            "PostgreSQL Performance Tuning",
            "Book and practical database project",
            4,
            1,
        ),
        "power bi": ("Google Data Analytics or Power BI Training", "Course", 4, 2),
        "networking": ("Cisco CCNA", "Certification", 4, 3),
        "python": ("Python Advanced", "Course and portfolio project", 4, 2),
        "ci/cd": ("CI/CD Pipeline Training", "Training and automation project", 3, 1),
    }
    _spoken_languages = (
        "English",
        "German",
        "French",
        "Spanish",
        "Italian",
        "Albanian",
    )

    def detect_languages(self, text: str) -> list[str]:
        sample = text.casefold()
        return [
            language
            for language in self._spoken_languages
            if language.casefold() in sample
        ]

    def generate(
        self,
        match_result: dict[str, object],
        *,
        candidate_skills: list[str],
        education: list[str],
        experience: list[str],
        certifications: list[str],
        languages: list[str],
        required_skills: list[str],
        preferred_skills: list[str],
        job_title: str,
        job_description: str,
    ) -> dict[str, object]:
        overall_score = int(match_result["overall_match"])
        missing_required = self._missing(candidate_skills, required_skills)
        missing_preferred = self._missing(candidate_skills, preferred_skills)
        language_gaps = self._missing(
            languages, self._required_languages(job_description)
        )
        strengths = self._strengths(match_result)
        weaknesses = self._weaknesses(
            match_result, missing_required, missing_preferred, language_gaps
        )
        opportunities = self._opportunities(
            missing_required,
            missing_preferred,
            language_gaps,
            match_result,
            education=education,
            experience=experience,
            certifications=certifications,
        )
        score_gain = min(
            15, sum(item["estimated_score_gain"] for item in opportunities)
        )
        potential_score = min(100, overall_score + score_gain)
        career_level = self._career_level(experience)
        return {
            "overall_score": overall_score,
            "summary": self._summary(overall_score, job_title, missing_required),
            "strengths": strengths,
            "weaknesses": weaknesses,
            "missing_skills": missing_required,
            "missing_required_skills": missing_required,
            "missing_preferred_skills": missing_preferred,
            "language_gaps": language_gaps,
            "recommendations": opportunities,
            "career_insights": {
                "career_readiness_level": career_level,
                "hiring_probability": self._hiring_probability(overall_score),
                "explanation": self._explanation(
                    match_result, missing_required, job_title
                ),
            },
            "score_improvement": {
                "current_score": overall_score,
                "potential_score": potential_score,
                "improvement_percentage": potential_score - overall_score,
                "estimated_time_months": max(
                    (item["estimated_time_months"] for item in opportunities), default=0
                ),
            },
        }

    def rank_similar_jobs(
        self,
        candidate_skills: list[str],
        education: list[str],
        experience: list[str],
        target_job: dict[str, object],
        jobs: list[dict[str, object]],
    ) -> list[dict[str, object]]:
        ranked: list[dict[str, object]] = []
        for job in jobs:
            skill_score = self._skill_score(
                candidate_skills, list(job.get("required_skills", []))
            )
            experience_score = self._experience_score(
                experience, str(job.get("experience_level") or "")
            )
            education_score = self._education_score(
                education, str(job.get("description") or "")
            )
            location_score = self._same_value(
                job.get("location"), target_job.get("location")
            )
            industry_score = self._same_value(
                job.get("industry"), target_job.get("industry")
            )
            employment_score = self._same_value(
                job.get("employment_type"), target_job.get("employment_type")
            )
            compatibility = round(
                skill_score * 0.55
                + experience_score * 0.15
                + education_score * 0.10
                + location_score * 0.08
                + industry_score * 0.06
                + employment_score * 0.06
            )
            ranked.append(
                {
                    "job_id": job["job_id"],
                    "title": job["title"],
                    "compatibility": max(0, min(100, compatibility)),
                    "reason": self._job_reason(
                        skill_score, location_score, industry_score, employment_score
                    ),
                }
            )
        return sorted(
            ranked,
            key=lambda job: (-job["compatibility"], str(job["title"]).casefold()),
        )[:5]

    def _strengths(self, match_result: dict[str, object]) -> list[str]:
        strengths = [
            f"Strong {skill} knowledge"
            for skill in list(match_result.get("matched_skills", []))[:4]
        ]
        if int(match_result.get("experience_match", 0)) >= 75:
            strengths.append("Experience aligns well with the role.")
        if int(match_result.get("education_match", 0)) >= 75:
            strengths.append("Education aligns well with the role requirements.")
        return strengths or ["The profile has a foundation to build on for this role."]

    def _weaknesses(
        self,
        match_result: dict[str, object],
        missing_required: list[str],
        missing_preferred: list[str],
        language_gaps: list[str],
    ) -> list[str]:
        weaknesses = [f"Missing required skill: {skill}" for skill in missing_required]
        weaknesses.extend(
            f"Missing preferred skill: {skill}" for skill in missing_preferred[:2]
        )
        if int(match_result.get("experience_match", 0)) < 60:
            weaknesses.append("Experience level is below the role requirement.")
        if int(match_result.get("education_match", 0)) < 60:
            weaknesses.append(
                "Education background does not fully meet the role requirement."
            )
        if int(match_result.get("certification_match", 0)) < 60:
            weaknesses.append("Relevant certification evidence is limited.")
        weaknesses.extend(
            f"Missing required language: {language}" for language in language_gaps
        )
        return weaknesses

    def _opportunities(
        self,
        missing_required: list[str],
        missing_preferred: list[str],
        language_gaps: list[str],
        match_result: dict[str, object],
        *,
        education: list[str],
        experience: list[str],
        certifications: list[str],
    ) -> list[dict[str, object]]:
        opportunities: list[dict[str, object]] = []
        for skill in missing_required[:4]:
            opportunities.append(
                self._skill_opportunity(skill, "High", "Required in this position.")
            )
        for skill in missing_preferred[:2]:
            opportunities.append(
                self._skill_opportunity(
                    skill, "Medium", "Preferred qualification for this position."
                )
            )
        if int(match_result.get("experience_match", 0)) < 60 and not experience:
            opportunities.append(
                self._opportunity(
                    "Experience",
                    "High",
                    "Build relevant hands-on experience through projects, internships, or freelance work.",
                    "The role expects more practical experience.",
                    4,
                    3,
                )
            )
        if int(match_result.get("education_match", 0)) < 60 and not education:
            opportunities.append(
                self._opportunity(
                    "Education",
                    "Medium",
                    "Complete role-relevant coursework or a recognized degree program.",
                    "Education requirements are not yet demonstrated.",
                    3,
                    4,
                )
            )
        if int(match_result.get("certification_match", 0)) < 60 and not certifications:
            opportunities.append(
                self._opportunity(
                    "Role-relevant certification",
                    "Medium",
                    "Earn a recognized certification aligned with the role.",
                    "Certification evidence would strengthen employability.",
                    3,
                    2,
                )
            )
        for language in language_gaps:
            opportunities.append(
                self._opportunity(
                    f"{language} language training",
                    "High",
                    f"Complete professional {language} language training.",
                    "This language is mentioned in the job requirements.",
                    3,
                    3,
                )
            )
        return opportunities[:7]

    def _skill_opportunity(
        self, skill: str, priority: str, reason: str
    ) -> dict[str, object]:
        title, learning_type, gain, months = self._learning_catalog.get(
            self._normalize(skill),
            (f"Learn {skill}", "Course and portfolio project", 3, 1),
        )
        return self._opportunity(title, priority, learning_type, reason, gain, months)

    @staticmethod
    def _opportunity(
        title: str,
        priority: str,
        learning_type: str,
        reason: str,
        gain: int,
        months: int,
    ) -> dict[str, object]:
        return {
            "priority": priority,
            "title": title,
            "learning_type": learning_type,
            "reason": reason,
            "estimated_score_gain": gain,
            "estimated_time_months": months,
        }

    def _summary(self, score: int, job_title: str, missing_required: list[str]) -> str:
        if score >= 85:
            prefix = "Excellent"
        elif score >= 70:
            prefix = "Strong"
        elif score >= 50:
            prefix = "Developing"
        else:
            prefix = "Early-stage"
        gap = (
            f" Minor gaps include {', '.join(missing_required[:2])}."
            if missing_required
            else " The profile covers the identified required skills."
        )
        return f"{prefix} profile for {job_title}.{gap}"

    def _explanation(
        self, match_result: dict[str, object], missing_skills: list[str], job_title: str
    ) -> str:
        matched = (
            ", ".join(list(match_result.get("matched_skills", []))[:3])
            or "some core profile signals"
        )
        if missing_skills:
            return f"The score for {job_title} reflects a match in {matched}, while {', '.join(missing_skills[:3])} remains the main gap lowering compatibility."
        return f"The score for {job_title} is supported by strong alignment in {matched}, with no required-skill gaps identified."

    @staticmethod
    def _hiring_probability(score: int) -> str:
        if score >= 85:
            return "Very High"
        if score >= 70:
            return "High"
        if score >= 50:
            return "Medium"
        return "Low"

    @staticmethod
    def _career_level(experience: list[str]) -> str:
        text = " ".join(experience).casefold()
        years = re.search(r"(\d+)\s+years?", text)
        total_years = int(years.group(1)) if years else 0
        if total_years >= 8:
            return "Expert"
        if total_years >= 5:
            return "Senior"
        if total_years >= 2:
            return "Mid-Level"
        return "Junior" if experience else "Beginner"

    def _missing(self, available: list[str], required: list[str]) -> list[str]:
        available_set = {self._normalize(value) for value in available}
        return [
            value for value in required if self._normalize(value) not in available_set
        ]

    def _required_languages(self, description: str) -> list[str]:
        return [
            language
            for language in self._spoken_languages
            if language.casefold() in description.casefold()
        ]

    @staticmethod
    def _normalize(value: str) -> str:
        return re.sub(r"\s+", " ", value.strip().casefold())

    def _skill_score(
        self, candidate_skills: list[str], required_skills: list[str]
    ) -> int:
        if not required_skills:
            return 0
        candidate_set = {self._normalize(skill) for skill in candidate_skills}
        required_set = {self._normalize(skill) for skill in required_skills}
        return round(100 * len(candidate_set & required_set) / len(required_set))

    def _experience_score(self, experience: list[str], requirement: str) -> int:
        if not requirement:
            return 50 if experience else 0
        text = " ".join(experience).casefold()
        if (
            any(token in text for token in ("senior", "lead", "5+"))
            and "senior" in requirement.casefold()
        ):
            return 100
        return 70 if experience else 0

    def _education_score(self, education: list[str], requirement: str) -> int:
        if not requirement:
            return 50 if education else 0
        education_text = " ".join(education).casefold()
        requirement_text = requirement.casefold()
        return (
            100
            if education_text
            and any(degree in requirement_text for degree in education_text.split())
            else (50 if education else 0)
        )

    def _same_value(self, value: object, target: object) -> int:
        return (
            100
            if value
            and target
            and self._normalize(str(value)) == self._normalize(str(target))
            else 0
        )

    @staticmethod
    def _job_reason(
        skill_score: int,
        location_score: int,
        industry_score: int,
        employment_score: int,
    ) -> str:
        reasons = [f"{skill_score}% skill compatibility"]
        if location_score:
            reasons.append("matching location")
        if industry_score:
            reasons.append("matching industry")
        if employment_score:
            reasons.append("matching employment type")
        return ", ".join(reasons) + "."
