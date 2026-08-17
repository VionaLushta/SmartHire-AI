from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class SkillCatalog:
    programming_languages: tuple[str, ...] = (
        "Python",
        "Java",
        "C#",
        "C++",
        "JavaScript",
        "TypeScript",
        "PHP",
        "SQL",
        "Go",
        "Rust",
        "Ruby",
    )
    frameworks: tuple[str, ...] = (
        "React",
        "Next.js",
        "Vue",
        "Angular",
        "Node.js",
        "Express",
        "FastAPI",
        "Django",
        "Flask",
        "Spring Boot",
        "Laravel",
    )
    databases: tuple[str, ...] = (
        "PostgreSQL",
        "MySQL",
        "MongoDB",
        "Redis",
        "SQLite",
        "SQL Server",
    )
    cloud: tuple[str, ...] = ("AWS", "Azure", "Google Cloud", "GCP")
    devops: tuple[str, ...] = (
        "Docker",
        "Kubernetes",
        "Git",
        "GitHub",
        "CI/CD",
        "Linux",
        "Windows Server",
    )
    ai_data_science: tuple[str, ...] = (
        "TensorFlow",
        "PyTorch",
        "Scikit-learn",
        "Pandas",
        "NumPy",
    )
    soft_skills: tuple[str, ...] = (
        "Communication",
        "Leadership",
        "Problem Solving",
        "Teamwork",
        "Agile",
        "Scrum",
    )
    office_tools: tuple[str, ...] = ("Excel", "Power BI", "Word", "PowerPoint")
    networking: tuple[str, ...] = ("TCP/IP", "DNS", "Routing", "Switching", "VPN")
    cybersecurity: tuple[str, ...] = ("Firewall", "SIEM", "IDS", "IPS", "SOC", "IAM")

    def categories(self) -> dict[str, tuple[str, ...]]:
        return {
            "Programming Languages": self.programming_languages,
            "Frameworks": self.frameworks,
            "Databases": self.databases,
            "Cloud": self.cloud,
            "DevOps": self.devops,
            "AI / Data Science": self.ai_data_science,
            "Soft Skills": self.soft_skills,
            "Office Tools": self.office_tools,
            "Networking": self.networking,
            "Cybersecurity": self.cybersecurity,
        }


class SkillExtractor:
    def __init__(self) -> None:
        self.catalog = SkillCatalog()

    @staticmethod
    def _normalize(skill: str) -> str:
        cleaned = re.sub(r"\s+", " ", skill.strip())
        if cleaned.lower() in {
            "c#",
            "c++",
            "ci/cd",
            "dns",
            "vpn",
            "ids",
            "ips",
            "soc",
            "iam",
        }:
            return (
                cleaned.upper() if cleaned.lower() in {"c#", "c++"} else cleaned.upper()
            )
        if cleaned.lower() == "gcp":
            return "Google Cloud"
        if cleaned.lower() == "github":
            return "GitHub"
        if cleaned.lower() == "node.js":
            return "Node.js"
        if cleaned.lower() == "next.js":
            return "Next.js"
        if cleaned.lower() == "scikit-learn":
            return "Scikit-learn"
        if cleaned.lower() == "power bi":
            return "Power BI"
        if cleaned.lower() == "ci/cd":
            return "CI/CD"
        if cleaned.lower() == "sql server":
            return "SQL Server"
        return cleaned if cleaned.isupper() else cleaned[:1].upper() + cleaned[1:]

    @staticmethod
    def _tokenize(text: str) -> str:
        return f" {text.lower()} "

    def _contains(self, text: str, term: str) -> bool:
        normalized = self._tokenize(text)
        pattern = re.escape(f" {term.lower()} ")
        if term.lower() in {
            "c#",
            "c++",
            "ci/cd",
            "node.js",
            "next.js",
            "sql server",
            "power bi",
            "google cloud",
        }:
            return term.lower() in text.lower()
        return re.search(pattern, normalized) is not None

    def extract(self, text: str) -> dict[str, object]:
        if not isinstance(text, str):
            raise ValueError("Text must be a string.")
        sample = text.strip()
        if not sample:
            raise ValueError("Text is empty.")
        if len(sample) > 200_000:
            raise ValueError("Text is too large.")

        found: list[str] = []
        categories: dict[str, list[str]] = {}

        for category, skills in self.catalog.categories().items():
            for skill in skills:
                if self._contains(sample, skill):
                    normalized = self._normalize(skill)
                    categories.setdefault(category, []).append(normalized)
                    found.append(normalized)

        unique_skills = sorted(
            {self._normalize(skill) for skill in found}, key=lambda value: value.lower()
        )
        normalized_categories = {
            category: sorted(
                {self._normalize(skill) for skill in values},
                key=lambda value: value.lower(),
            )
            for category, values in categories.items()
            if values
        }

        return {
            "skills": unique_skills,
            "total_skills": len(unique_skills),
            "categories": normalized_categories,
        }
