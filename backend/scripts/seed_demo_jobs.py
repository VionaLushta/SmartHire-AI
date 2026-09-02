from __future__ import annotations

import sys
from contextlib import contextmanager
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import sessionmaker

BACKEND_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_ROOT / ".env"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import Settings  # noqa: E402
from app.repositories.auth_repository import AuthRepository  # noqa: E402
from app.repositories.job_repository import JobRepository  # noqa: E402
from app.repositories.job_skill_repository import JobSkillRepository  # noqa: E402
from app.models.job import Department, Job, JobSkill  # noqa: E402


def _load_settings() -> Settings:
    return Settings(_env_file=ENV_FILE, _env_file_encoding="utf-8")


@contextmanager
def _session_scope(database_url: str):
    engine = create_engine(database_url, pool_pre_ping=True)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _future_deadline(days: int) -> date:
    return date.today() + timedelta(days=days)


def _skill_category(skill_name: str) -> str:
    skill = skill_name.casefold()
    if skill in {"python", "java", "node.js", "django", "fastapi", "spring boot", "express.js", "php", "laravel", "asp.net", "go", "rust"}:
        return "Backend"
    if skill in {"html", "css", "javascript", "typescript", "react", "angular", "vue", "next.js", "tailwind css", "bootstrap", "figma"}:
        return "Frontend"
    if skill in {"mysql", "postgresql", "mongodb", "redis", "sql server", "oracle"}:
        return "Database"
    if skill in {"docker", "kubernetes", "git", "github", "gitlab", "linux", "ci/cd", "jenkins"}:
        return "DevOps"
    if skill in {"aws", "azure", "google cloud", "firebase"}:
        return "Cloud"
    if skill in {"machine learning", "tensorflow", "pytorch", "openai api", "langchain", "power bi", "pandas", "scikit-learn"}:
        return "AI"
    return "Soft Skills"


DEMO_COMPANIES = [
    {
        "name": "NovaByte Labs",
        "industry": "Software Product Engineering",
        "website": "https://novabyte.example.com",
        "location": "Prishtina, Kosovo",
        "departments": [
            "Software Engineering", "Frontend Development", "Backend Development",
            "Full Stack Engineering", "Mobile Development", "AI & Machine Learning",
            "Data Engineering", "Data Science", "Cyber Security", "Network Engineering",
            "Cloud Engineering", "DevOps", "QA & Testing", "UI/UX Design",
            "Product Engineering", "Infrastructure", "Technical Support", "IT Operations",
            "Database Engineering", "Business Intelligence",
        ],
    },
    {
        "name": "HarborShield Technologies",
        "industry": "Cybersecurity Services",
        "website": "https://harborshield.example.com",
        "location": "New York, USA",
        "departments": [
            "Software Engineering", "Frontend Development", "Backend Development",
            "Full Stack Engineering", "Mobile Development", "AI & Machine Learning",
            "Data Engineering", "Data Science", "Cyber Security", "Network Engineering",
            "Cloud Engineering", "DevOps", "QA & Testing", "UI/UX Design",
            "Product Engineering", "Infrastructure", "Technical Support", "IT Operations",
            "Database Engineering", "Business Intelligence",
        ],
    },
    {
        "name": "Cape Analytics Studio",
        "industry": "Data, AI & Digital Products",
        "website": "https://capeanalytics.example.com",
        "location": "Cape Town, South Africa",
        "departments": [
            "Software Engineering", "Frontend Development", "Backend Development",
            "Full Stack Engineering", "Mobile Development", "AI & Machine Learning",
            "Data Engineering", "Data Science", "Cyber Security", "Network Engineering",
            "Cloud Engineering", "DevOps", "QA & Testing", "UI/UX Design",
            "Product Engineering", "Infrastructure", "Technical Support", "IT Operations",
            "Database Engineering", "Business Intelligence",
        ],
    },
]

DEMO_JOBS = [
    {
        "company": "NovaByte Labs",
        "department": "Software Engineering",
        "title": "Backend Developer",
        "location": "Prishtina, Kosovo",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Junior",
        "salary_min": 1400,
        "salary_max": 2200,
        "description": "Build reliable APIs and internal services for a fast-growing B2B SaaS platform used by hiring teams across the Balkans.",
        "responsibilities": "Develop REST APIs, integrate third-party services, write maintainable tests, and collaborate with frontend and product teams.",
        "requirements": "1+ years of experience with Python or Java, solid SQL knowledge, and familiarity with authentication, version control, and clean API design.",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Git"],
        "preferred_skills": ["Docker", "AWS", "CI/CD", "Communication"],
        "deadline_days": 45,
    },
    {
        "company": "NovaByte Labs",
        "department": "Software Engineering",
        "title": "Frontend Developer",
        "location": "Prishtina, Kosovo",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 1500,
        "salary_max": 2400,
        "description": "Shape polished candidate and recruiter experiences for a modern recruitment platform with a strong product focus.",
        "responsibilities": "Implement responsive interfaces, refine component systems, improve accessibility, and ship features with design parity.",
        "requirements": "2+ years working with React and TypeScript, experience with responsive UI, and an eye for performance and accessibility.",
        "required_skills": ["React", "TypeScript", "HTML", "CSS"],
        "preferred_skills": ["Tailwind CSS", "Figma", "Next.js", "Teamwork"],
        "deadline_days": 42,
    },
    {
        "company": "NovaByte Labs",
        "department": "Software Engineering",
        "title": "Full Stack Developer",
        "location": "Prishtina, Kosovo",
        "work_mode": "On-site",
        "employment_type": "Full-time",
        "experience_level": "Senior",
        "salary_min": 2600,
        "salary_max": 3800,
        "description": "Own end-to-end product delivery across backend services, database design, and UI workflows for enterprise hiring tools.",
        "responsibilities": "Lead feature development, review code, design scalable data flows, and partner with stakeholders on delivery planning.",
        "requirements": "4+ years across backend and frontend development, experience with API design, SQL databases, and production troubleshooting.",
        "required_skills": ["Python", "React", "PostgreSQL", "Docker"],
        "preferred_skills": ["AWS", "System Design", "Leadership", "GitHub"],
        "deadline_days": 38,
    },
    {
        "company": "HarborShield Technologies",
        "department": "Cyber Security",
        "title": "Cyber Security Analyst",
        "location": "New York, USA",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 85000,
        "salary_max": 110000,
        "description": "Monitor threats, investigate alerts, and strengthen customer security posture for a managed security operations team.",
        "responsibilities": "Analyze suspicious activity, support incident response, document findings, and tune detection rules.",
        "requirements": "2+ years in security operations or blue team work, strong understanding of SIEM workflows, and incident handling basics.",
        "required_skills": ["SIEM", "Linux", "Network Security", "Communication"],
        "preferred_skills": ["Splunk", "Microsoft Sentinel", "Incident Response", "Threat Hunting"],
        "deadline_days": 31,
    },
    {
        "company": "HarborShield Technologies",
        "department": "Cyber Security",
        "title": "SOC Analyst",
        "location": "New York, USA",
        "work_mode": "On-site",
        "employment_type": "Full-time",
        "experience_level": "Junior",
        "salary_min": 70000,
        "salary_max": 92000,
        "description": "Support 24/7 security monitoring for a high-volume environment that protects financial and healthcare clients.",
        "responsibilities": "Triage alerts, escalate incidents, maintain shift notes, and help improve alert fidelity.",
        "requirements": "Entry-level SOC or IT security experience, comfort with ticketing tools, and a strong attention to detail.",
        "required_skills": ["SIEM", "Linux", "Networking", "Problem Solving"],
        "preferred_skills": ["Splunk", "Python", "Threat Intelligence", "Teamwork"],
        "deadline_days": 29,
    },
    {
        "company": "HarborShield Technologies",
        "department": "Cyber Security",
        "title": "Penetration Tester",
        "location": "New York, USA",
        "work_mode": "Remote",
        "employment_type": "Contract",
        "experience_level": "Senior",
        "salary_min": 105000,
        "salary_max": 135000,
        "description": "Perform authorized security assessments against web applications, APIs, and cloud environments for enterprise clients.",
        "responsibilities": "Plan tests, execute findings safely, write clear reports, and support remediation verification.",
        "requirements": "5+ years in offensive security or application security, proven report writing skills, and experience with common exploitation tooling.",
        "required_skills": ["Web Security", "Burp Suite", "Linux", "Python"],
        "preferred_skills": ["Cloud Security", "OWASP", "Go", "Leadership"],
        "deadline_days": 27,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "Data Engineering",
        "title": "Data Engineer",
        "location": "Cape Town, South Africa",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 600000,
        "salary_max": 820000,
        "description": "Build data pipelines and analytics foundations for retail and logistics clients scaling their reporting stack.",
        "responsibilities": "Create ETL workflows, model analytics tables, monitor data quality, and support BI integrations.",
        "requirements": "3+ years building data pipelines, strong SQL, and practical experience with orchestration and warehouse design.",
        "required_skills": ["Python", "SQL", "ETL", "PostgreSQL"],
        "preferred_skills": ["Airflow", "Power BI", "AWS", "Pandas"],
        "deadline_days": 36,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "Data Science",
        "title": "Data Analyst",
        "location": "Cape Town, South Africa",
        "work_mode": "On-site",
        "employment_type": "Full-time",
        "experience_level": "Junior",
        "salary_min": 320000,
        "salary_max": 420000,
        "description": "Turn operational and customer data into actionable insights for product, sales, and operations leaders.",
        "responsibilities": "Build dashboards, prepare recurring reports, analyze trends, and present recommendations to stakeholders.",
        "requirements": "1+ years using SQL and BI tools, good communication skills, and comfort working with messy business data.",
        "required_skills": ["SQL", "Power BI", "Excel", "Communication"],
        "preferred_skills": ["Python", "Statistics", "Data Visualization", "Problem Solving"],
        "deadline_days": 40,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "AI & Machine Learning",
        "title": "AI Engineer",
        "location": "Cape Town, South Africa",
        "work_mode": "Remote",
        "employment_type": "Full-time",
        "experience_level": "Senior",
        "salary_min": 900000,
        "salary_max": 1200000,
        "description": "Design AI-powered product features that blend language models, search, and workflow automation for enterprise use cases.",
        "responsibilities": "Prototype AI features, evaluate model performance, integrate APIs, and guide responsible deployment practices.",
        "requirements": "4+ years in software or ML engineering, experience shipping production AI features, and strong Python fundamentals.",
        "required_skills": ["Python", "OpenAI API", "Machine Learning", "API Design"],
        "preferred_skills": ["LangChain", "Docker", "Azure", "Prompt Engineering"],
        "deadline_days": 34,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "AI & Machine Learning",
        "title": "Machine Learning Engineer",
        "location": "Cape Town, South Africa",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 700000,
        "salary_max": 950000,
        "description": "Productionize machine learning models that improve forecasting, ranking, and personalization across client products.",
        "responsibilities": "Train and deploy models, track experiments, automate retraining, and collaborate on feature pipelines.",
        "requirements": "3+ years in ML or data science, experience with Python ML stacks, and familiarity with deployment workflows.",
        "required_skills": ["Python", "Machine Learning", "Pandas", "Scikit-learn"],
        "preferred_skills": ["PyTorch", "Docker", "ML Ops", "AWS"],
        "deadline_days": 33,
    },
    {
        "company": "NovaByte Labs",
        "department": "Software Engineering",
        "title": "Java Developer",
        "location": "Prishtina, Kosovo",
        "work_mode": "On-site",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 1800,
        "salary_max": 2800,
        "description": "Modernize internal services and integrations for a growing recruitment operations platform used by enterprise customers.",
        "responsibilities": "Build services in Java and Spring Boot, maintain integrations, and support production issues.",
        "requirements": "3+ years with Java, Spring Boot, and relational databases, plus experience working in agile teams.",
        "required_skills": ["Java", "Spring Boot", "SQL", "Git"],
        "preferred_skills": ["Docker", "REST APIs", "AWS", "Problem Solving"],
        "deadline_days": 37,
    },
    {
        "company": "NovaByte Labs",
        "department": "Software Engineering",
        "title": "Python Developer",
        "location": "Prishtina, Kosovo",
        "work_mode": "Remote",
        "employment_type": "Full-time",
        "experience_level": "Junior",
        "salary_min": 1300,
        "salary_max": 2000,
        "description": "Contribute to automation, API, and data-processing features for a product-led engineering team.",
        "responsibilities": "Write Python services, support tests and refactoring, and work closely with senior engineers on delivery.",
        "requirements": "Solid Python fundamentals, familiarity with APIs and SQL, and willingness to learn production practices.",
        "required_skills": ["Python", "FastAPI", "SQL", "Git"],
        "preferred_skills": ["Docker", "Pandas", "Linux", "Communication"],
        "deadline_days": 41,
    },
    {
        "company": "HarborShield Technologies",
        "department": "Software Engineering",
        "title": ".NET Developer",
        "location": "New York, USA",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 90000,
        "salary_max": 118000,
        "description": "Build secure internal tools and customer-facing portals for a compliance-heavy software environment.",
        "responsibilities": "Develop services in C# and .NET, integrate data sources, and support release cycles.",
        "requirements": "3+ years with C# and .NET, knowledge of REST APIs, and experience with SQL Server or similar databases.",
        "required_skills": ["C#", ".NET", "SQL Server", "Git"],
        "preferred_skills": ["Azure", "Docker", "Unit Testing", "Teamwork"],
        "deadline_days": 35,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "Software Engineering",
        "title": "DevOps Engineer",
        "location": "Cape Town, South Africa",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Senior",
        "salary_min": 780000,
        "salary_max": 1020000,
        "description": "Keep product deployments predictable, secure, and observable across multiple client environments.",
        "responsibilities": "Own CI/CD pipelines, improve infrastructure automation, and partner with engineers on release reliability.",
        "requirements": "4+ years in DevOps or platform engineering, strong Linux and container knowledge, and cloud deployment experience.",
        "required_skills": ["Docker", "Kubernetes", "Linux", "CI/CD"],
        "preferred_skills": ["AWS", "GitHub", "Jenkins", "Infrastructure as Code"],
        "deadline_days": 32,
    },
    {
        "company": "HarborShield Technologies",
        "department": "Cyber Security",
        "title": "Network Engineer",
        "location": "New York, USA",
        "work_mode": "On-site",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 82000,
        "salary_max": 108000,
        "description": "Maintain secure and resilient network infrastructure for a multi-site enterprise security operation.",
        "responsibilities": "Manage routing, switching, VPNs, and network troubleshooting while supporting security controls.",
        "requirements": "3+ years in network administration, strong TCP/IP fundamentals, and hands-on experience with enterprise networking gear.",
        "required_skills": ["Networking", "Linux", "Troubleshooting", "Communication"],
        "preferred_skills": ["Cisco", "Firewall Management", "Cloud Networking", "Problem Solving"],
        "deadline_days": 28,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "UI/UX Design",
        "title": "UI/UX Designer",
        "location": "Cape Town, South Africa",
        "work_mode": "Hybrid",
        "employment_type": "Contract",
        "experience_level": "Mid-level",
        "salary_min": 350000,
        "salary_max": 520000,
        "description": "Design intuitive user journeys for analytics and hiring products with a strong emphasis on clarity and trust.",
        "responsibilities": "Conduct product discovery, create wireframes and prototypes, and collaborate with engineering on delivery details.",
        "requirements": "2+ years designing web products, strong portfolio, and experience with user research or usability testing.",
        "required_skills": ["Figma", "User Research", "Prototyping", "Communication"],
        "preferred_skills": ["Design Systems", "Accessibility", "HTML", "CSS"],
        "deadline_days": 39,
    },
    {
        "company": "NovaByte Labs",
        "department": "Software Engineering",
        "title": "Mobile Developer (Android/iOS)",
        "location": "Prishtina, Kosovo",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Junior",
        "salary_min": 1500,
        "salary_max": 2300,
        "description": "Build mobile experiences that help candidates track applications and receive timely hiring updates.",
        "responsibilities": "Develop and maintain mobile features, fix production bugs, and work with backend APIs.",
        "requirements": "Experience with Android or iOS development, understanding of mobile APIs, and basic release management knowledge.",
        "required_skills": ["Java", "Kotlin", "iOS", "REST APIs"],
        "preferred_skills": ["React Native", "Firebase", "Testing", "Git"],
        "deadline_days": 44,
    },
    {
        "company": "HarborShield Technologies",
        "department": "Cyber Security",
        "title": "Cloud Engineer",
        "location": "New York, USA",
        "work_mode": "Remote",
        "employment_type": "Full-time",
        "experience_level": "Senior",
        "salary_min": 115000,
        "salary_max": 145000,
        "description": "Design secure cloud landing zones and support migration work for regulated enterprise customers.",
        "responsibilities": "Build cloud infrastructure, improve security posture, and collaborate on automation and cost controls.",
        "requirements": "5+ years in cloud or infrastructure engineering, deep AWS or Azure experience, and knowledge of secure architecture patterns.",
        "required_skills": ["AWS", "Azure", "Docker", "Linux"],
        "preferred_skills": ["Kubernetes", "Terraform", "Security Architecture", "CI/CD"],
        "deadline_days": 26,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "Software Engineering",
        "title": "Software Engineer",
        "location": "Cape Town, South Africa",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 550000,
        "salary_max": 760000,
        "description": "Deliver product features across the stack for a client platform used by operations and analytics teams.",
        "responsibilities": "Implement product features, write tests, support releases, and contribute to technical planning.",
        "requirements": "3+ years of software development experience, familiarity with APIs and databases, and a collaborative mindset.",
        "required_skills": ["Python", "React", "SQL", "Git"],
        "preferred_skills": ["Docker", "AWS", "System Design", "Problem Solving"],
        "deadline_days": 43,
    },
    {
        "company": "NovaByte Labs",
        "department": "Data Science",
        "title": "Data Scientist Intern",
        "location": "Prishtina, Kosovo",
        "work_mode": "Remote",
        "employment_type": "Internship",
        "experience_level": "Internship",
        "salary_min": 700,
        "salary_max": 1000,
        "description": "Support model experimentation and reporting for the product and analytics teams while learning production data workflows.",
        "responsibilities": "Prepare datasets, validate model outputs, and document experiment results.",
        "requirements": "Currently studying computer science, data science, or a related field and comfortable with Python and SQL.",
        "required_skills": ["Python", "SQL", "Pandas", "Statistics"],
        "preferred_skills": ["Machine Learning", "Power BI", "Communication", "Teamwork"],
        "deadline_days": 48,
    },
    {
        "company": "NovaByte Labs",
        "department": "Frontend Development",
        "title": "React Developer",
        "location": "Prizren, Kosovo",
        "work_mode": "Remote",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 1800,
        "salary_max": 2900,
        "description": "Create fast, accessible interfaces for candidate portals and recruiter workflows used across Europe.",
        "responsibilities": "Build reusable React components, collaborate with designers, improve performance, and maintain frontend tests.",
        "requirements": "2+ years with React, strong JavaScript fundamentals, and experience consuming REST APIs in production.",
        "required_skills": ["React", "TypeScript", "Tailwind CSS", "JavaScript"],
        "preferred_skills": ["Next.js", "Playwright", "Figma", "Accessibility"],
        "deadline_days": 36,
    },
    {
        "company": "NovaByte Labs",
        "department": "Backend Development",
        "title": "Node.js Developer",
        "location": "Ferizaj, Kosovo",
        "work_mode": "Hybrid",
        "employment_type": "Part-time",
        "experience_level": "Junior",
        "salary_min": 900,
        "salary_max": 1500,
        "description": "Help extend event-driven services that connect employer tools, candidate profiles, and notifications.",
        "responsibilities": "Implement API endpoints, write integration tests, troubleshoot service issues, and document technical decisions.",
        "requirements": "At least one year with Node.js, familiarity with asynchronous programming, and basic PostgreSQL knowledge.",
        "required_skills": ["Node.js", "Express.js", "PostgreSQL", "REST APIs"],
        "preferred_skills": ["TypeScript", "Redis", "Docker", "Jest"],
        "deadline_days": 30,
    },
    {
        "company": "NovaByte Labs",
        "department": "Full Stack Engineering",
        "title": "Solutions Architect",
        "location": "Prishtina, Kosovo",
        "work_mode": "On-site",
        "employment_type": "Full-time",
        "experience_level": "Lead",
        "salary_min": 3600,
        "salary_max": 5200,
        "description": "Guide the architecture of secure, scalable recruitment products from discovery through enterprise rollout.",
        "responsibilities": "Define service boundaries, review technical designs, mentor engineers, and communicate trade-offs to stakeholders.",
        "requirements": "7+ years in software engineering, proven distributed systems experience, and strong architecture communication skills.",
        "required_skills": ["System Design", "Python", "React", "PostgreSQL"],
        "preferred_skills": ["AWS", "Kubernetes", "Event-Driven Architecture", "Leadership"],
        "deadline_days": 52,
    },
    {
        "company": "NovaByte Labs",
        "department": "Mobile Development",
        "title": "iOS Developer",
        "location": "Prishtina, Kosovo",
        "work_mode": "Hybrid",
        "employment_type": "Contract",
        "experience_level": "Mid-level",
        "salary_min": 2200,
        "salary_max": 3400,
        "description": "Deliver a polished iOS experience that keeps candidates informed throughout the hiring journey.",
        "responsibilities": "Build Swift features, integrate APIs, improve app reliability, and participate in App Store releases.",
        "requirements": "2+ years of iOS development, solid Swift knowledge, and experience with networking and local persistence.",
        "required_skills": ["Swift", "iOS", "REST APIs", "Xcode"],
        "preferred_skills": ["SwiftUI", "Firebase", " XCTest", "CI/CD"],
        "deadline_days": 34,
    },
    {
        "company": "HarborShield Technologies",
        "department": "AI & Machine Learning",
        "title": "Deep Learning Engineer",
        "location": "Seattle, United States",
        "work_mode": "Remote",
        "employment_type": "Full-time",
        "experience_level": "Senior",
        "salary_min": 145000,
        "salary_max": 185000,
        "description": "Develop deep learning systems that improve document understanding and security signal detection.",
        "responsibilities": "Train neural networks, build evaluation pipelines, optimize inference, and partner with product engineers.",
        "requirements": "5+ years in applied ML, strong Python skills, and experience taking PyTorch models into production.",
        "required_skills": ["Python", "PyTorch", "Deep Learning", "NLP"],
        "preferred_skills": ["TensorFlow", "GPU Optimization", "MLOps", "Kubernetes"],
        "deadline_days": 46,
    },
    {
        "company": "HarborShield Technologies",
        "department": "Data Science",
        "title": "Data Scientist",
        "location": "Austin, United States",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 105000,
        "salary_max": 135000,
        "description": "Turn candidate and security operations data into models and insights that improve product decisions.",
        "responsibilities": "Explore datasets, design experiments, communicate findings, and collaborate on model deployment.",
        "requirements": "3+ years in data science, strong statistics, and practical experience with Python and SQL.",
        "required_skills": ["Python", "SQL", "Pandas", "Scikit-learn"],
        "preferred_skills": ["PyTorch", "A/B Testing", "Jupyter", "Data Visualization"],
        "deadline_days": 40,
    },
    {
        "company": "HarborShield Technologies",
        "department": "Cloud Engineering",
        "title": "AWS Engineer",
        "location": "New York, United States",
        "work_mode": "On-site",
        "employment_type": "Full-time",
        "experience_level": "Senior",
        "salary_min": 125000,
        "salary_max": 160000,
        "description": "Operate resilient AWS environments for security products with demanding availability and compliance needs.",
        "responsibilities": "Build landing zones, automate infrastructure, improve observability, and lead incident reviews.",
        "requirements": "4+ years with AWS infrastructure, strong networking knowledge, and experience with infrastructure as code.",
        "required_skills": ["AWS", "Terraform", "Linux", "Networking"],
        "preferred_skills": ["Kubernetes", "CloudFormation", "Python", "Security"],
        "deadline_days": 29,
    },
    {
        "company": "HarborShield Technologies",
        "department": "QA & Testing",
        "title": "Automation QA Engineer",
        "location": "Berlin, Germany",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 65000,
        "salary_max": 85000,
        "description": "Raise release confidence through reliable automated testing for security and workflow products.",
        "responsibilities": "Design test suites, maintain CI checks, investigate failures, and partner with developers on quality standards.",
        "requirements": "3+ years in QA automation, experience with browser and API testing, and comfort working in CI pipelines.",
        "required_skills": ["Playwright", "Python", "API Testing", "CI/CD"],
        "preferred_skills": ["Selenium", "Postman", "Docker", "Test Strategy"],
        "deadline_days": 31,
    },
    {
        "company": "HarborShield Technologies",
        "department": "Infrastructure",
        "title": "System Administrator",
        "location": "Munich, Germany",
        "work_mode": "On-site",
        "employment_type": "Full-time",
        "experience_level": "Junior",
        "salary_min": 48000,
        "salary_max": 62000,
        "description": "Keep internal Linux and identity systems dependable for teams building critical security software.",
        "responsibilities": "Administer servers, manage access, monitor systems, handle backups, and resolve employee support escalations.",
        "requirements": "1+ years in systems administration, practical Linux experience, and an organized approach to troubleshooting.",
        "required_skills": ["Linux", "Active Directory", "Networking", "Bash"],
        "preferred_skills": ["AWS", "Ansible", "Monitoring", "ITIL"],
        "deadline_days": 25,
    },
    {
        "company": "HarborShield Technologies",
        "department": "Database Engineering",
        "title": "Database Administrator",
        "location": "Hamburg, Germany",
        "work_mode": "Hybrid",
        "employment_type": "Contract",
        "experience_level": "Senior",
        "salary_min": 82000,
        "salary_max": 108000,
        "description": "Protect performance, availability, and recoverability across databases supporting security operations.",
        "responsibilities": "Tune queries, manage backups, plan upgrades, monitor capacity, and support incident response.",
        "requirements": "5+ years administering PostgreSQL or comparable relational databases in production environments.",
        "required_skills": ["PostgreSQL", "SQL", "Database Administration", "Linux"],
        "preferred_skills": ["Redis", "AWS RDS", "Replication", "Performance Tuning"],
        "deadline_days": 38,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "Data Engineering",
        "title": "Senior Data Engineer",
        "location": "Johannesburg, South Africa",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Senior",
        "salary_min": 780000,
        "salary_max": 1050000,
        "description": "Build trustworthy batch and streaming pipelines for financial and logistics analytics products.",
        "responsibilities": "Design data models, develop ETL jobs, monitor freshness, and establish data quality checks.",
        "requirements": "4+ years in data engineering, advanced SQL, and experience with distributed processing and orchestration.",
        "required_skills": ["SQL", "Spark", "Airflow", "Python"],
        "preferred_skills": ["Kafka", "AWS", "dbt", "Data Quality"],
        "deadline_days": 43,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "Business Intelligence",
        "title": "BI Developer",
        "location": "Johannesburg, South Africa",
        "work_mode": "On-site",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 480000,
        "salary_max": 680000,
        "description": "Give business teams clear dashboards and trusted metrics for customer, product, and delivery decisions.",
        "responsibilities": "Build Power BI reports, model semantic layers, validate metrics, and train report users.",
        "requirements": "2+ years delivering BI solutions, strong SQL, and the ability to translate business questions into useful reporting.",
        "required_skills": ["Power BI", "SQL", "Data Modeling", "DAX"],
        "preferred_skills": ["Python", "Azure", "ETL", "Stakeholder Management"],
        "deadline_days": 35,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "UI/UX Design",
        "title": "Product Designer",
        "location": "Cape Town, South Africa",
        "work_mode": "Remote",
        "employment_type": "Part-time",
        "experience_level": "Mid-level",
        "salary_min": 260000,
        "salary_max": 390000,
        "description": "Turn complex analytics workflows into calm, understandable product experiences for growing teams.",
        "responsibilities": "Lead discovery workshops, create prototypes, test concepts, and maintain a cohesive design system.",
        "requirements": "3+ years designing SaaS products with a portfolio showing research, interaction design, and shipped work.",
        "required_skills": ["Figma", "User Research", "Prototyping", "Design Systems"],
        "preferred_skills": ["Accessibility", "Analytics", "Usability Testing", "CSS"],
        "deadline_days": 33,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "Technical Support",
        "title": "IT Support Specialist",
        "location": "Frankfurt, Germany",
        "work_mode": "On-site",
        "employment_type": "Full-time",
        "experience_level": "Junior",
        "salary_min": 42000,
        "salary_max": 56000,
        "description": "Help customers and internal teams resolve product, account, and workstation issues with care and speed.",
        "responsibilities": "Handle support tickets, reproduce issues, maintain knowledge articles, and coordinate technical escalations.",
        "requirements": "1+ years in technical support, clear written communication, and basic understanding of web applications and networks.",
        "required_skills": ["Technical Support", "Troubleshooting", "Linux", "Customer Service"],
        "preferred_skills": ["SQL", "Zendesk", "Networking", "ITIL"],
        "deadline_days": 27,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "IT Operations",
        "title": "Platform Engineer",
        "location": "San Francisco, United States",
        "work_mode": "Remote",
        "employment_type": "Full-time",
        "experience_level": "Senior",
        "salary_min": 135000,
        "salary_max": 175000,
        "description": "Build the internal platform that lets product teams deploy analytics services safely and independently.",
        "responsibilities": "Develop platform tooling, standardize deployments, improve developer experience, and measure reliability.",
        "requirements": "5+ years in platform or infrastructure engineering with strong Kubernetes and cloud experience.",
        "required_skills": ["Kubernetes", "Docker", "Terraform", "Linux"],
        "preferred_skills": ["AWS", "Go", "GitHub Actions", "Observability"],
        "deadline_days": 45,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "Product Engineering",
        "title": "Technical Project Manager",
        "location": "Seattle, United States",
        "work_mode": "Hybrid",
        "employment_type": "Contract",
        "experience_level": "Lead",
        "salary_min": 120000,
        "salary_max": 155000,
        "description": "Coordinate cross-functional delivery of data products from roadmap commitment to measurable customer outcomes.",
        "responsibilities": "Plan milestones, manage dependencies, surface risks, facilitate decisions, and keep delivery communication clear.",
        "requirements": "6+ years leading technical projects and enough engineering fluency to work confidently with data and product teams.",
        "required_skills": ["Project Management", "Agile", "Risk Management", "Communication"],
        "preferred_skills": ["Scrum", "SQL", "Jira", "Data Platforms"],
        "deadline_days": 41,
    },
    {
        "company": "Cape Analytics Studio",
        "department": "Network Engineering",
        "title": "Network Engineer",
        "location": "Berlin, Germany",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 60000,
        "salary_max": 80000,
        "description": "Maintain secure connectivity between offices, cloud environments, and the data platforms powering client reporting.",
        "responsibilities": "Configure switches and firewalls, troubleshoot connectivity, document topology, and improve network resilience.",
        "requirements": "3+ years in network engineering with hands-on routing, switching, VPN, and firewall experience.",
        "required_skills": ["Cisco", "TCP/IP", "VLAN", "Routing"],
        "preferred_skills": ["Firewalls", "Linux", "Cloud Networking", "CCNA"],
        "deadline_days": 32,
    },
    {
        "company": "NovaByte Labs",
        "department": "DevOps",
        "title": "DevOps Engineer",
        "location": "Munich, Germany",
        "work_mode": "On-site",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 70000,
        "salary_max": 92000,
        "description": "Improve the delivery pipeline for a multi-service SaaS product serving international hiring teams.",
        "responsibilities": "Maintain CI/CD, automate environments, improve monitoring, and partner with teams on secure releases.",
        "requirements": "3+ years in DevOps, practical Docker and Linux experience, and confidence supporting production systems.",
        "required_skills": ["Docker", "Kubernetes", "GitHub Actions", "Linux"],
        "preferred_skills": ["AWS", "Terraform", "Prometheus", "Python"],
        "deadline_days": 39,
    },
    {
        "company": "NovaByte Labs",
        "department": "IT Operations",
        "title": "Scrum Master",
        "location": "Prizren, Kosovo",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Senior",
        "salary_min": 2400,
        "salary_max": 3600,
        "description": "Help cross-functional product teams deliver consistently while improving collaboration and engineering flow.",
        "responsibilities": "Facilitate ceremonies, remove delivery blockers, coach teams, and use metrics to improve planning and flow.",
        "requirements": "4+ years as a Scrum Master or delivery lead in software teams, with strong facilitation and conflict-resolution skills.",
        "required_skills": ["Scrum", "Agile", "Facilitation", "Jira"],
        "preferred_skills": ["Kanban", "Product Delivery", "Coaching", "Metrics"],
        "deadline_days": 47,
    },
    {
        "company": "NovaByte Labs",
        "department": "Cloud Engineering",
        "title": "Azure Engineer",
        "location": "Frankfurt, Germany",
        "work_mode": "Hybrid",
        "employment_type": "Full-time",
        "experience_level": "Mid-level",
        "salary_min": 68000,
        "salary_max": 90000,
        "description": "Build secure Azure services for enterprise recruitment workflows and data integrations across Europe.",
        "responsibilities": "Automate Azure resources, improve deployment reliability, monitor cloud costs, and support secure platform operations.",
        "requirements": "3+ years with Azure infrastructure, practical networking knowledge, and experience with Terraform or similar tools.",
        "required_skills": ["Azure", "Terraform", "Linux", "Cloud Security"],
        "preferred_skills": ["Kubernetes", "PowerShell", "CI/CD", "Monitoring"],
        "deadline_days": 37,
    },
]


def _ensure_demo_companies(db) -> dict[str, dict]:
    repo = AuthRepository(db)
    companies: dict[str, dict] = {}
    for company_data in DEMO_COMPANIES:
        company = repo.get_company_by_name(company_data["name"])
        if company is None:
            company = repo.create_company(
                name=company_data["name"],
                industry=company_data["industry"],
                website=company_data["website"],
                location=company_data["location"],
            )
        companies[company_data["name"]] = company
    return companies


def _ensure_departments(db, companies: dict[str, dict]) -> dict[tuple[str, str], dict]:
    department_map: dict[tuple[str, str], dict] = {}
    for company_data in DEMO_COMPANIES:
        company = companies[company_data["name"]]
        for department_name in company_data["departments"]:
            statement = select(Department.__table__).where(
                Department.__table__.c.company_id == company["company_id"],
                Department.__table__.c.name == department_name,
            )
            row = db.execute(statement).mappings().first()
            if row is None:
                row = db.execute(
                    Department.__table__.insert()
                    .values(
                        company_id=company["company_id"],
                        name=department_name,
                        description=f"{department_name} team at {company_data['name']}.",
                    )
                    .returning(*Department.__table__.c)
                ).mappings().one()
                db.commit()
            department_map[(company_data["name"], department_name)] = dict(row)
    return department_map


def seed_demo_jobs(db) -> int:
    skill_repo = JobSkillRepository(db)

    skill_repo.seed_skill_library()
    companies = _ensure_demo_companies(db)
    departments = _ensure_departments(db, companies)

    existing_jobs = {
        (row["company_id"], row["title"]): dict(row)
        for row in db.execute(select(Job.__table__)).mappings().all()
    }

    created_or_updated = 0
    for job_data in DEMO_JOBS:
        company = companies[job_data["company"]]
        department = departments[(job_data["company"], job_data["department"])]
        values = {
            "company_id": company["company_id"],
            "department_id": department["department_id"],
            "title": job_data["title"],
            "description": job_data["description"],
            "responsibilities": job_data["responsibilities"],
            "requirements": job_data["requirements"],
            "employment_type": job_data["employment_type"],
            "experience_level": job_data["experience_level"],
            "salary_min": job_data["salary_min"],
            "salary_max": job_data["salary_max"],
            "location": job_data["location"],
            "remote_option": job_data["work_mode"].lower() == "remote",
            "deadline": _future_deadline(job_data["deadline_days"]),
            "status": "open",
        }
        key = (company["company_id"], job_data["title"])
        current = existing_jobs.get(key)
        if current is None:
            row = db.execute(
                Job.__table__.insert().values(**values).returning(*Job.__table__.c)
            ).mappings().one()
            job = dict(row)
            db.commit()
            created_or_updated += 1
        else:
            row = db.execute(
                Job.__table__.update()
                .where(Job.__table__.c.job_id == current["job_id"])
                .values(**values)
                .returning(*Job.__table__.c)
            ).mappings().one()
            job = dict(row)
            db.commit()
            created_or_updated += 1

        db.execute(delete(JobSkill.__table__).where(JobSkill.__table__.c.job_id == job["job_id"]))
        db.commit()
        for skill_name in job_data["required_skills"]:
            skill_repo.create_or_update_job_skill(
                job["job_id"],
                name=skill_name,
                category=_skill_category(skill_name),
                is_required=True,
                required_level=None,
            )
        for skill_name in job_data["preferred_skills"]:
            skill_repo.create_or_update_job_skill(
                job["job_id"],
                name=skill_name,
                category=_skill_category(skill_name),
                is_required=False,
                required_level=None,
            )

    return created_or_updated


def main() -> int:
    settings = _load_settings()
    if not settings.database_url:
        raise SystemExit("DATABASE_URL is not configured.")

    with _session_scope(settings.database_url) as db:
        count = seed_demo_jobs(db)
        db.commit()
        print(f"Seeded {count} demo jobs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
