from contextlib import asynccontextmanager
import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import get_settings
from app.database.database import SessionLocal
from app.api.auth import router as auth_router
from app.api.ai_resume import router as ai_resume_router
from app.api.ai_dashboard import router as ai_dashboard_router
from app.api.company import router as company_router
from app.api.company_dashboard import router as company_dashboard_router
from app.api.candidate import router as candidate_router
from app.api.certificate import router as certificate_router
from app.api.candidate_dashboard import router as candidate_dashboard_router
from app.api.education import router as education_router
from app.api.department import router as department_router
from app.api.job import router as job_router
from app.api.job_dashboard import router as job_dashboard_router
from app.api.job_category import router as job_category_router
from app.api.resume import router as resume_router
from app.api.saved_job import router as saved_job_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("smarthire.api")

OPENAPI_TAGS = [
    {"name": "auth", "description": "Registration, JWT access tokens, refresh-token rotation, and current user operations."},
    {"name": "companies", "description": "Company and department management for authorized company members and administrators."},
    {"name": "jobs", "description": "Job, category, and saved-job CRUD operations."},
    {"name": "resume", "description": "Candidate-owned resume and certificate uploads with signature validation."},
    {"name": "ai", "description": "Local resume parsing, skill extraction, matching, ranking, and recommendations."},
    {"name": "ai analytics", "description": "Role-scoped recruitment analytics and report exports."},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    try:
        if not settings.database_url or SessionLocal is None:
            raise RuntimeError("DATABASE_URL is not configured.")

        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("database connection verified")
    except Exception as exc:
        logger.exception("database connection verification failed: %s", exc)
    yield


app = FastAPI(
    title="SmartHire AI API",
    version="1.0.0",
    description="Production API for SmartHire recruitment workflows, AI-assisted candidate analysis, and analytics.",
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan,
    responses={
        401: {"description": "Authentication is required or the access token is invalid."},
        403: {"description": "The authenticated user is not authorized for this resource."},
        404: {"description": "The requested resource was not found."},
        422: {"description": "The request payload or query parameters failed validation."},
    },
)


@app.middleware("http")
async def log_request(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    logger.info("request method=%s path=%s status=%s duration_ms=%.2f", request.method, request.url.path, response.status_code, (time.perf_counter() - started) * 1000)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(company_router)
app.include_router(auth_router)
app.include_router(ai_resume_router)
app.include_router(ai_dashboard_router)
app.include_router(company_dashboard_router)
app.include_router(candidate_dashboard_router)
app.include_router(candidate_router)
app.include_router(certificate_router)
app.include_router(education_router)
app.include_router(department_router)
app.include_router(job_router)
app.include_router(job_dashboard_router)
app.include_router(job_category_router)
app.include_router(resume_router)
app.include_router(saved_job_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "SmartHire AI API is running"}
