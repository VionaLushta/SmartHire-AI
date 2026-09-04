"""Seed isolated presentation data for the reporting dashboard.

Usage:
    python scripts/seed_demo_reporting.py seed
    python scripts/seed_demo_reporting.py reset

Demo candidates use the ``demo.smarthire.local`` email domain and are never
used by the normal login flow. Reset removes only records created by this file.
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import Settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.application import AIAnalysis, Application  # noqa: E402
from app.models.certificate import Certificate  # noqa: E402
from app.models.company import Company  # noqa: E402
from app.models.job import Department, Job, JobSkill  # noqa: E402
from app.models.resume import Education, Resume  # noqa: E402
from app.models.role import Role  # noqa: E402
from app.models.resume_skill import ResumeSkill  # noqa: E402
from app.models.skill import Skill  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.interview import Interview  # noqa: E402

DEMO_DOMAIN = "demo.smarthire.local"
COMPANY_NAME = "SmartHire AI Demo Studio"

JOBS = [
    ("Backend Engineer", "Backend Engineering"), ("Frontend Developer", "Frontend Engineering"),
    ("Full Stack Developer", "Product Engineering"), ("AI Engineer", "AI & Machine Learning"),
    ("Machine Learning Engineer", "AI & Machine Learning"), ("Data Engineer", "Data Engineering"),
    ("Data Scientist", "Data Science"), ("Cyber Security Analyst", "Cyber Security"),
    ("Network Engineer", "Infrastructure"), ("DevOps Engineer", "DevOps"),
    ("Cloud Engineer", "Cloud Engineering"), ("QA Engineer", "QA & Testing"),
    ("UI/UX Designer", "Design"), ("Mobile Developer", "Mobile Engineering"),
    ("Technical Project Manager", "Product Management"),
]

CANDIDATES = [
    ("Arben", "Krasniqi", "Prishtina, Kosovo", "Backend Engineer", 94, "hired", ["Python", "FastAPI", "PostgreSQL", "Docker"], "MSc Computer Science", "AWS Certified Developer"),
    ("Elira", "Hoxha", "Prizren, Kosovo", "Frontend Developer", 88, "accepted", ["React", "TypeScript", "Tailwind CSS", "Figma"], "BSc Software Engineering", "Meta Front-End Certificate"),
    ("Jonas", "Weber", "Berlin, Germany", "Full Stack Developer", 91, "interview", ["React", "Node.js", "PostgreSQL", "AWS"], "BSc Information Systems", "AWS Solutions Architect"),
    ("Sophie", "Muller", "Munich, Germany", "AI Engineer", 86, "technical_test", ["Python", "PyTorch", "OpenAI API", "LangChain"], "MSc Artificial Intelligence", "TensorFlow Developer Certificate"),
    ("Maya", "Patel", "New York, USA", "Machine Learning Engineer", 96, "accepted", ["Python", "TensorFlow", "Scikit-learn", "Pandas"], "PhD Machine Learning", "Google Professional ML Engineer"),
    ("Ethan", "Brooks", "San Francisco, USA", "Data Engineer", 83, "under_review", ["Python", "Spark", "SQL", "Airflow"], "MSc Data Engineering", "Databricks Data Engineer"),
    ("Lerato", "Mokoena", "Cape Town, South Africa", "Data Scientist", 79, "pending", ["Python", "Pandas", "Scikit-learn", "Power BI"], "MSc Statistics", "Microsoft Power BI Data Analyst"),
    ("Thabo", "Nkosi", "Johannesburg, South Africa", "Cyber Security Analyst", 90, "interview", ["Linux", "SIEM", "Python", "Network Security"], "BSc Cyber Security", "CompTIA Security+"),
    ("Drita", "Berisha", "Prishtina, Kosovo", "QA Engineer", 77, "technical_test", ["Playwright", "Cypress", "JavaScript", "Postman"], "BSc Computer Science", "ISTQB Foundation"),
    ("Luan", "Gashi", "Prizren, Kosovo", "DevOps Engineer", 89, "hired", ["Docker", "Kubernetes", "GitLab CI", "Linux"], "BSc Computer Engineering", "Certified Kubernetes Administrator"),
    ("Clara", "Fischer", "Berlin, Germany", "UI/UX Designer", 72, "rejected", ["Figma", "UX Research", "Design Systems", "Prototyping"], "BA Interaction Design", "Google UX Design Certificate"),
    ("Felix", "Schneider", "Munich, Germany", "Cloud Engineer", 93, "accepted", ["AWS", "Terraform", "Kubernetes", "Python"], "MSc Cloud Computing", "AWS Solutions Architect"),
    ("Nora", "Williams", "New York, USA", "Mobile Developer", 81, "under_review", ["Swift", "Kotlin", "Firebase", "REST APIs"], "BSc Software Engineering", "Android Developer Certificate"),
    ("Noah", "Garcia", "San Francisco, USA", "AI Engineer", 98, "hired", ["Python", "PyTorch", "Transformers", "MLOps"], "MSc Artificial Intelligence", "NVIDIA Deep Learning Institute"),
    ("Ayesha", "Daniels", "Cape Town, South Africa", "Network Engineer", 68, "pending", ["Cisco", "Routing", "Linux", "Network Security"], "BSc Network Engineering", "Cisco CCNA"),
    ("Kabelo", "Dlamini", "Johannesburg, South Africa", "Technical Project Manager", 74, "interview", ["Agile", "Jira", "Scrum", "Risk Management"], "MBA Technology Management", "PMI Agile Certified Practitioner"),
    ("Mira", "Rexhepi", "Prishtina, Kosovo", "Data Engineer", 87, "accepted", ["SQL", "Python", "dbt", "Snowflake"], "MSc Data Science", "Snowflake SnowPro Core"),
    ("Besa", "Shala", "Prizren, Kosovo", "Frontend Developer", 63, "rejected", ["HTML", "CSS", "JavaScript", "Vue"], "BSc Information Technology", "Frontend Web Developer Certificate"),
    ("Lukas", "Klein", "Berlin, Germany", "Cyber Security Analyst", 85, "technical_test", ["SIEM", "Python", "Cloud Security", "Incident Response"], "MSc Cyber Security", "GIAC Security Essentials"),
    ("Anna", "Hartmann", "Munich, Germany", "QA Engineer", 76, "pending", ["Selenium", "Java", "SQL", "Jenkins"], "BSc Computer Science", "ISTQB Advanced Test Analyst"),
    ("James", "Carter", "New York, USA", "Backend Engineer", 92, "hired", ["Java", "Spring Boot", "Kafka", "PostgreSQL"], "MSc Software Engineering", "Oracle Java SE Developer"),
    ("Zoe", "Anderson", "San Francisco, USA", "UI/UX Designer", 84, "accepted", ["Figma", "UX Research", "Accessibility", "Prototyping"], "BA Digital Design", "NN/g UX Certification"),
    ("Sipho", "Maseko", "Cape Town, South Africa", "Cloud Engineer", 71, "under_review", ["Azure", "Terraform", "Docker", "Linux"], "BSc Information Systems", "Microsoft Azure Administrator"),
    ("Amara", "Okafor", "Johannesburg, South Africa", "Data Scientist", 95, "interview", ["Python", "R", "Pandas", "Machine Learning"], "MSc Data Science", "IBM Data Science Professional"),
    ("Rina", "Yamada", "Berlin, Germany", "Technical Project Manager", 66, "pending", ["Agile", "Jira", "Stakeholder Management", "SQL"], "MSc Engineering Management", "PRINCE2 Practitioner"),
]


def session() -> Session:
    settings = Settings(_env_file=ROOT / ".env", _env_file_encoding="utf-8")
    return Session(create_engine(settings.database_url, pool_pre_ping=True))


def reset(db: Session) -> int:
    ids = [row[0] for row in db.execute(select(User.user_id).where(User.email.like(f"%@{DEMO_DOMAIN}"))).all()]
    if not ids:
        return 0
    app_ids = [row[0] for row in db.execute(select(Application.application_id).where(Application.user_id.in_(ids))).all()]
    resume_ids = [row[0] for row in db.execute(select(Resume.resume_id).where(Resume.user_id.in_(ids))).all()]
    if app_ids:
        db.execute(delete(Interview).where(Interview.application_id.in_(app_ids)))
        db.execute(delete(AIAnalysis).where(AIAnalysis.application_id.in_(app_ids)))
        db.execute(delete(Application).where(Application.application_id.in_(app_ids)))
    db.execute(delete(Certificate).where(Certificate.user_id.in_(ids)))
    if resume_ids:
        db.execute(delete(ResumeSkill).where(ResumeSkill.resume_id.in_(resume_ids)))
        db.execute(delete(Education).where(Education.resume_id.in_(resume_ids)))
    db.execute(delete(Education).where(Education.resume_id.in_(select(Resume.resume_id).where(Resume.user_id.in_(ids)))))
    db.execute(delete(Resume).where(Resume.user_id.in_(ids)))
    db.execute(delete(User).where(User.user_id.in_(ids)))
    company = db.scalar(select(Company).where(Company.name == COMPANY_NAME))
    if company:
        db.delete(company)
    db.commit()
    return len(ids)


def seed(db: Session) -> None:
    reset(db)
    role_id = db.scalar(select(Role.role_id).where(Role.name.ilike("candidate")))
    if role_id is None:
        raise RuntimeError("Candidate role is missing; seed demo data only after normal database setup.")
    company = Company(name=COMPANY_NAME, industry="Technology", website="https://demo.smarthire.local", location="International")
    db.add(company)
    db.flush()
    departments = {}
    for _, department_name in JOBS:
        if department_name not in departments:
            department = Department(company_id=company.company_id, name=department_name, description="Demo reporting department")
            db.add(department)
            db.flush()
            departments[department_name] = department.department_id
    jobs = {}
    for title, department_name in JOBS:
        job = Job(company_id=company.company_id, department_id=departments[department_name], title=title, description=f"Demo opening for a {title}.", requirements="Relevant technical experience and strong collaboration skills.", location="Hybrid", remote_option=True, employment_type="Full-time", experience_level="Mid-level", status="published", created_at=datetime.now(timezone.utc) - timedelta(days=70), updated_at=datetime.now(timezone.utc))
        db.add(job)
        db.flush()
        jobs[title] = job.job_id
    skill_names = {skill for item in CANDIDATES for skill in item[6]} | {"Docker", "Kubernetes"}
    skill_map = {}
    for skill_name in skill_names:
        skill = db.scalar(select(Skill).where(Skill.name == skill_name))
        if skill is None:
            skill = Skill(name=skill_name, category="Demo")
            db.add(skill)
            db.flush()
        skill_map[skill_name] = skill.skill_id
    linked_jobs = set()
    for first, last, location, job_title, score, status, skills, degree, certificate in CANDIDATES:
        if job_title in linked_jobs:
            continue
        linked_jobs.add(job_title)
        for skill_name in skills[:3]:
            db.add(JobSkill(job_id=jobs[job_title], skill_id=skill_map[skill_name], is_required=True, required_level=3))
    demo_password = hash_password("DemoOnly123!")
    now = datetime.now(timezone.utc)
    for index, (first, last, location, job_title, score, status, skills, degree, certificate) in enumerate(CANDIDATES, start=1):
        user_id = uuid4()
        city, country = location.split(", ", 1)
        user = User(user_id=user_id, role_id=role_id, first_name=first, last_name=last, email=f"candidate{index:02d}@{DEMO_DOMAIN}", password_hash=demo_password, phone=f"+383 44 555 {index:03d}", city=city, country=country, email_verified_at=now, created_at=now - timedelta(days=60-index), updated_at=now - timedelta(days=60-index))
        db.add(user)
        db.flush()
        resume = Resume(user_id=user_id, file_path=f"demo/{index:02d}_resume.pdf", parsed_text=f"{first} {last}. {degree}. Skills: {', '.join(skills)}. {max(1, score // 10 - 3)} years of experience.")
        db.add(resume)
        db.flush()
        for skill_name in skills:
            db.add(ResumeSkill(resume_id=resume.resume_id, skill_id=skill_map[skill_name], confidence=min(0.99, score / 100)))
        db.add(Education(resume_id=resume.resume_id, institution=f"{city} Institute of Technology", degree=degree, field_of_study="Technology"))
        db.add(Certificate(user_id=user_id, title=certificate, issuer="Demo Certification Board", issue_date=(now - timedelta(days=180)).date(), file_path=f"demo/{index:02d}_{certificate[:12].replace(' ', '_')}.pdf"))
        applied_at = now - timedelta(days=59 - ((index * 2) % 58))
        application = Application(user_id=user_id, job_id=jobs[job_title], resume_id=resume.resume_id, status=status, created_at=applied_at, updated_at=applied_at)
        db.add(application)
        db.flush()
        db.add(AIAnalysis(application_id=application.application_id, overall_score=score, resume_score=max(50, score - 3), skills_score=score, education_score=max(55, score - 6), experience_score=max(55, score - 2), language_score=90, certificate_score=max(55, score - 4), missing_skills="Docker, Kubernetes" if score < 80 else "", strengths=", ".join(skills[:3]), recommendations=f"Strong demo match for {job_title}."))
        if status == "interview":
            db.add(Interview(application_id=application.application_id, interviewer_id=user_id, scheduled_at=applied_at + timedelta(days=5), interview_type="Online", status="scheduled"))
    db.commit()
    print(f"Created {len(CANDIDATES)} demo candidates and {len(CANDIDATES)} demo applications.")


if __name__ == "__main__":
    command = sys.argv[1].lower() if len(sys.argv) > 1 else "seed"
    with session() as database:
        if command == "reset":
            print(f"Removed {reset(database)} demo candidates.")
        elif command == "seed":
            seed(database)
        else:
            raise SystemExit("Use: seed_demo_reporting.py [seed|reset]")
