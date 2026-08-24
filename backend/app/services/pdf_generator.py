from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence
import re
import unicodedata

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from app.core.config import get_settings
from app.templates.pdf_letter import (
    build_body_paragraphs,
    build_bullet_list,
    build_key_value_table,
    build_letter_styles,
    build_separator,
    build_signature_table,
)


@dataclass(frozen=True)
class CompanyProfile:
    name: str = "SmartHire AI"
    address: str = "1200 Market Street, Suite 400, San Francisco, CA 94103"
    email: str = "hr@smarthire.ai"
    phone: str = "+1 (555) 013-2048"
    website: str = "www.smarthire.ai"


@dataclass(frozen=True)
class GeneratedDocumentResult:
    file_path: str
    generated_at: datetime
    document_type: str


class DocumentGenerationError(RuntimeError):
    """Base exception for document generation failures."""


class DocumentValidationError(DocumentGenerationError):
    """Raised when required candidate or job information is missing."""


class DocumentStorageError(DocumentGenerationError):
    """Raised when output folders or files cannot be created."""


class PdfGenerator:
    DOCUMENT_TYPES = {
        "offer": {
            "label": "Offer of Employment",
            "folder": "offer_letters",
            "prefix": "Offer",
            "code": "OFFER",
        },
        "interview": {
            "label": "Interview Invitation",
            "folder": "interview_letters",
            "prefix": "Interview",
            "code": "INT",
        },
        "rejection": {
            "label": "Application Status Notice",
            "folder": "rejection_letters",
            "prefix": "Rejection",
            "code": "REJ",
        },
        "hold": {
            "label": "Application On Hold Notice",
            "folder": "hold_letters",
            "prefix": "Hold",
            "code": "HOLD",
        },
    }

    def __init__(
        self,
        report_root: str | Path | None = None,
        company_profile: CompanyProfile | Mapping[str, Any] | Any | None = None,
    ) -> None:
        self.styles = build_letter_styles()
        self.company = self._resolve_company_profile(company_profile)
        self.report_root = self._resolve_report_root(report_root)

    def generate_offer_letter(
        self,
        candidate: Any,
        job: Any,
        recruiter_name: str,
        *,
        expected_start_date: date | datetime | str | None = None,
        employment_type: str | None = None,
        department: str | None = None,
        work_location: str | None = None,
        acceptance_instructions: Sequence[str] | None = None,
        reference_number: str | None = None,
        issue_date: date | datetime | None = None,
        company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    ) -> GeneratedDocumentResult:
        candidate_name, candidate_email, applied_position = self._normalize_candidate_and_job(candidate, job)
        company_profile = self._resolve_company_profile(company)
        issue_date = self._normalize_issue_date(issue_date)
        document_type = self.DOCUMENT_TYPES["offer"]["label"]
        reference_number = reference_number or self._build_reference_number(
            self.DOCUMENT_TYPES["offer"]["code"], candidate_name, issue_date
        )
        output_path = self._output_path(
            self.DOCUMENT_TYPES["offer"]["folder"],
            self.DOCUMENT_TYPES["offer"]["prefix"],
            candidate_name,
        )

        details = build_key_value_table(
            [
                ("Job Position", applied_position),
                ("Employment Type", employment_type or self._job_field(job, "employment_type") or "To be confirmed"),
                ("Department", department or self._job_department(job) or "To be confirmed"),
                ("Expected Start Date", self._format_date(expected_start_date) if expected_start_date else "To be confirmed"),
                ("Work Location", work_location or self._job_field(job, "location") or "To be confirmed"),
            ],
            self.styles,
        )

        story = self._build_standard_story(
            document_label=document_type,
            reference_number=reference_number,
            issue_date=issue_date,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            applied_position=applied_position,
            recruiter_name=recruiter_name,
            company_profile=company_profile,
            decision="Offer of Employment",
            body_paragraphs=[
                f"{company_profile.name} is pleased to extend this formal offer of employment for the {applied_position} position.",
                "This letter summarizes the principal conditions of your offer and should be reviewed carefully before acceptance.",
            ],
            detail_sections=[details],
            bullet_sections=[
                (
                    "Acceptance Instructions",
                    acceptance_instructions
                    or [
                        "Review the terms and confirm your acceptance in writing.",
                        "Return any required signed documents by the requested deadline.",
                        "Contact HR if you need clarification on the start date or onboarding steps.",
                    ],
                )
            ],
            closing_paragraphs=[
                "We look forward to the possibility of welcoming you to the team and appreciate the time you have invested in the process.",
                "Please keep this document for your records.",
            ],
            signature_table=build_signature_table(
                "HR Signature",
                recruiter_name or "Authorized Recruiter",
                "Candidate Signature",
                candidate_name,
                self.styles,
            ),
        )

        return self._render_pdf(
            output_path=output_path,
            document_type=document_type,
            reference_number=reference_number,
            issue_date=issue_date,
            story=story,
            company_profile=company_profile,
        )

    def generate_interview_letter(
        self,
        candidate: Any,
        job: Any,
        recruiter_name: str,
        *,
        interview_date: date | datetime | str | None = None,
        interview_time: str | None = None,
        interview_type: str | None = None,
        meeting_link: str | None = None,
        interviewer_name: str | None = None,
        preparation_instructions: Sequence[str] | None = None,
        reference_number: str | None = None,
        issue_date: date | datetime | None = None,
        company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    ) -> GeneratedDocumentResult:
        candidate_name, candidate_email, applied_position = self._normalize_candidate_and_job(candidate, job)
        company_profile = self._resolve_company_profile(company)
        issue_date = self._normalize_issue_date(issue_date)
        document_type = self.DOCUMENT_TYPES["interview"]["label"]
        reference_number = reference_number or self._build_reference_number(
            self.DOCUMENT_TYPES["interview"]["code"], candidate_name, issue_date
        )
        output_path = self._output_path(
            self.DOCUMENT_TYPES["interview"]["folder"],
            self.DOCUMENT_TYPES["interview"]["prefix"],
            candidate_name,
        )

        details = build_key_value_table(
            [
                ("Interview Date", self._format_date(interview_date) if interview_date else "To be confirmed"),
                ("Interview Time", interview_time or "To be confirmed"),
                ("Interview Type", interview_type or "To be confirmed"),
                ("Meeting Link", meeting_link or "Meeting link to be shared by recruiting team"),
                ("Interviewer Name", interviewer_name or recruiter_name or "To be assigned"),
            ],
            self.styles,
        )

        story = self._build_standard_story(
            document_label=document_type,
            reference_number=reference_number,
            issue_date=issue_date,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            applied_position=applied_position,
            recruiter_name=recruiter_name,
            company_profile=company_profile,
            decision="Interview Invitation",
            body_paragraphs=[
                f"We are pleased to invite you to the next stage of the hiring process for the {applied_position} position.",
                "Please review the interview details below and prepare accordingly.",
            ],
            detail_sections=[details],
            bullet_sections=[
                (
                    "Preparation Instructions",
                    preparation_instructions
                    or [
                        "Review your recent experience relevant to the role.",
                        "Be ready to discuss your technical approach and project examples.",
                        "Ensure you can join the meeting a few minutes early.",
                    ],
                )
            ],
            closing_paragraphs=[
                "We appreciate your continued interest in SmartHire AI and look forward to speaking with you.",
            ],
            signature_table=build_signature_table(
                "HR Signature",
                recruiter_name or "Authorized Recruiter",
                styles=self.styles,
            ),
        )

        return self._render_pdf(
            output_path=output_path,
            document_type=document_type,
            reference_number=reference_number,
            issue_date=issue_date,
            story=story,
            company_profile=company_profile,
        )

    def generate_rejection_letter(
        self,
        candidate: Any,
        job: Any,
        recruiter_name: str,
        *,
        reference_number: str | None = None,
        issue_date: date | datetime | None = None,
        company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    ) -> GeneratedDocumentResult:
        candidate_name, candidate_email, applied_position = self._normalize_candidate_and_job(candidate, job)
        company_profile = self._resolve_company_profile(company)
        issue_date = self._normalize_issue_date(issue_date)
        document_type = self.DOCUMENT_TYPES["rejection"]["label"]
        reference_number = reference_number or self._build_reference_number(
            self.DOCUMENT_TYPES["rejection"]["code"], candidate_name, issue_date
        )
        output_path = self._output_path(
            self.DOCUMENT_TYPES["rejection"]["folder"],
            self.DOCUMENT_TYPES["rejection"]["prefix"],
            candidate_name,
        )

        story = self._build_standard_story(
            document_label=document_type,
            reference_number=reference_number,
            issue_date=issue_date,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            applied_position=applied_position,
            recruiter_name=recruiter_name,
            company_profile=company_profile,
            decision="Application Status Notice",
            body_paragraphs=[
                f"Thank you for your interest in the {applied_position} opportunity at {company_profile.name}.",
                "After careful review, we have decided to move forward with another candidate whose experience more closely aligns with the current needs of the role.",
                "We sincerely appreciate the time and effort you invested in your application and encourage you to apply for future roles that match your background.",
            ],
            detail_sections=[],
            bullet_sections=[],
            closing_paragraphs=[
                "We wish you every success in your job search and thank you again for considering SmartHire AI.",
            ],
            signature_table=build_signature_table(
                "HR Signature",
                recruiter_name or "Authorized Recruiter",
                styles=self.styles,
            ),
        )

        return self._render_pdf(
            output_path=output_path,
            document_type=document_type,
            reference_number=reference_number,
            issue_date=issue_date,
            story=story,
            company_profile=company_profile,
        )

    def generate_hold_letter(
        self,
        candidate: Any,
        job: Any,
        recruiter_name: str,
        *,
        reference_number: str | None = None,
        issue_date: date | datetime | None = None,
        company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    ) -> GeneratedDocumentResult:
        candidate_name, candidate_email, applied_position = self._normalize_candidate_and_job(candidate, job)
        company_profile = self._resolve_company_profile(company)
        issue_date = self._normalize_issue_date(issue_date)
        document_type = self.DOCUMENT_TYPES["hold"]["label"]
        reference_number = reference_number or self._build_reference_number(
            self.DOCUMENT_TYPES["hold"]["code"], candidate_name, issue_date
        )
        output_path = self._output_path(
            self.DOCUMENT_TYPES["hold"]["folder"],
            self.DOCUMENT_TYPES["hold"]["prefix"],
            candidate_name,
        )

        story = self._build_standard_story(
            document_label=document_type,
            reference_number=reference_number,
            issue_date=issue_date,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            applied_position=applied_position,
            recruiter_name=recruiter_name,
            company_profile=company_profile,
            decision="Application On Hold Notice",
            body_paragraphs=[
                f"Your application for the {applied_position} position remains under review.",
                "At this time, we are not able to make a final decision, but we appreciate your patience while the hiring team completes the evaluation process.",
                "If the role moves forward, a member of the recruiting team may contact you with the next steps.",
            ],
            detail_sections=[],
            bullet_sections=[],
            closing_paragraphs=[
                "Thank you again for your interest in SmartHire AI.",
            ],
            signature_table=build_signature_table(
                "HR Signature",
                recruiter_name or "Authorized Recruiter",
                styles=self.styles,
            ),
        )

        return self._render_pdf(
            output_path=output_path,
            document_type=document_type,
            reference_number=reference_number,
            issue_date=issue_date,
            story=story,
            company_profile=company_profile,
        )

    def _build_standard_story(
        self,
        *,
        document_label: str,
        reference_number: str,
        issue_date: date,
        candidate_name: str,
        candidate_email: str,
        applied_position: str,
        recruiter_name: str,
        company_profile: CompanyProfile,
        decision: str,
        body_paragraphs: Sequence[str],
        detail_sections: Sequence[Any],
        bullet_sections: Sequence[tuple[str, Sequence[str]]],
        closing_paragraphs: Sequence[str],
        signature_table: Any,
    ) -> list[Any]:
        story: list[Any] = [
            Paragraph(document_label, self.styles["LetterTitle"]),
            Paragraph(
                f"{company_profile.name} | {company_profile.address}",
                self.styles["LetterSubtitle"],
            ),
            Spacer(1, 6),
            build_separator(),
            Spacer(1, 6),
            build_key_value_table(
                [
                    ("Reference Number", reference_number),
                    ("Issue Date", self._format_date(issue_date)),
                    ("Candidate Name", candidate_name),
                    ("Candidate Email", candidate_email),
                    ("Applied Position", applied_position),
                    ("Recruiter Name", recruiter_name or "Hiring Team"),
                    ("Decision", decision),
                    ("Company", company_profile.name),
                ],
                self.styles,
            ),
            Spacer(1, 10),
        ]

        story.extend(build_body_paragraphs(body_paragraphs, self.styles))

        for section in detail_sections:
            story.append(Spacer(1, 2))
            story.append(build_separator())
            story.append(Spacer(1, 3))
            story.append(Paragraph("Document Details", self.styles["LetterSection"]))
            story.append(section)
            story.append(Spacer(1, 8))

        for section_title, items in bullet_sections:
            story.append(Paragraph(section_title, self.styles["LetterSection"]))
            story.append(build_bullet_list(items, self.styles))
            story.append(Spacer(1, 6))

        story.extend(build_body_paragraphs(closing_paragraphs, self.styles))
        story.append(Spacer(1, 10))
        story.append(signature_table)
        story.append(Spacer(1, 10))
        story.append(
            Paragraph(
                "Official HR correspondence generated by SmartHire AI.",
                self.styles["LetterSmall"],
            )
        )
        return story

    def _render_pdf(
        self,
        *,
        output_path: Path,
        document_type: str,
        reference_number: str,
        issue_date: date,
        story: Sequence[Any],
        company_profile: CompanyProfile,
    ) -> GeneratedDocumentResult:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        generated_at = datetime.now(timezone.utc)

        try:
            doc = SimpleDocTemplate(
                str(output_path),
                pagesize=A4,
                leftMargin=18 * mm,
                rightMargin=18 * mm,
                topMargin=42 * mm,
                bottomMargin=24 * mm,
                title=document_type,
                author=company_profile.name,
                subject=document_type,
            )
            callback = self._build_page_callback(
                document_type=document_type,
                reference_number=reference_number,
                issue_date=issue_date,
                company_profile=company_profile,
            )
            doc.build(list(story), onFirstPage=callback, onLaterPages=callback)
        except PermissionError as exc:
            raise DocumentStorageError(f"Unable to write PDF to '{output_path}'.") from exc
        except OSError as exc:
            raise DocumentStorageError(f"Could not create report folder or file '{output_path}'.") from exc
        except Exception as exc:  # pragma: no cover - defensive wrapping
            raise DocumentGenerationError(f"Failed to generate '{document_type}'.") from exc

        if not output_path.exists():
            raise DocumentGenerationError(f"PDF generation completed but '{output_path}' was not created.")

        return GeneratedDocumentResult(
            file_path=str(output_path),
            generated_at=generated_at,
            document_type=document_type,
        )

    def _build_page_callback(
        self,
        *,
        document_type: str,
        reference_number: str,
        issue_date: date,
        company_profile: CompanyProfile,
    ):
        def draw(canvas: Canvas, doc: SimpleDocTemplate) -> None:
            canvas.saveState()
            width, height = A4
            left = doc.leftMargin
            right = width - doc.rightMargin
            header_y = height - 14 * mm
            footer_y = 12 * mm

            canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
            canvas.setFillColor(colors.HexColor("#0f172a"))
            canvas.roundRect(left, header_y - 7.5 * mm, 10 * mm, 10 * mm, 2.2 * mm, fill=1, stroke=0)
            canvas.setFillColor(colors.white)
            canvas.setFont("Helvetica-Bold", 10)
            canvas.drawCentredString(left + 5 * mm, header_y - 4.1 * mm, "SH")

            canvas.setFillColor(colors.HexColor("#0f172a"))
            canvas.setFont("Helvetica-Bold", 12)
            canvas.drawString(left + 13 * mm, header_y - 1.8 * mm, company_profile.name)
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(colors.HexColor("#475569"))
            canvas.drawString(left + 13 * mm, header_y - 6.1 * mm, company_profile.address)

            canvas.setFillColor(colors.HexColor("#0f172a"))
            canvas.setFont("Helvetica-Bold", 11)
            canvas.drawRightString(right, header_y - 1.8 * mm, document_type)
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(colors.HexColor("#475569"))
            canvas.drawRightString(right, header_y - 6.1 * mm, f"Reference {reference_number}")
            canvas.drawRightString(right, header_y - 9.2 * mm, f"Issue date {self._format_date(issue_date)}")

            canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
            canvas.setLineWidth(0.8)
            canvas.line(left, header_y - 11.8 * mm, right, header_y - 11.8 * mm)

            canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
            canvas.line(left, footer_y + 6 * mm, right, footer_y + 6 * mm)
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(colors.HexColor("#64748b"))
            canvas.drawString(
                left,
                footer_y,
                f"{company_profile.email} | {company_profile.phone} | {company_profile.website}",
            )
            canvas.drawRightString(right, footer_y, f"Page {canvas.getPageNumber()}")
            canvas.restoreState()

        return draw

    def _output_path(self, folder_name: str, prefix: str, candidate_name: str) -> Path:
        try:
            folder = self.report_root / folder_name
            folder.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise DocumentStorageError(f"Unable to create output folder '{folder_name}'.") from exc
        filename = f"{prefix}_{self._slugify(candidate_name)}.pdf"
        return folder / filename

    def _resolve_report_root(self, report_root: str | Path | None) -> Path:
        base = Path(report_root) if report_root else Path(get_settings().report_folder)
        if not base.is_absolute():
            base = Path(__file__).resolve().parents[2] / base
        try:
            base.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise DocumentStorageError(f"Unable to create report root '{base}'.") from exc
        return base

    def _resolve_company_profile(
        self, company: CompanyProfile | Mapping[str, Any] | Any | None
    ) -> CompanyProfile:
        default = CompanyProfile()
        if company is None:
            return default
        if isinstance(company, CompanyProfile):
            return company
        return CompanyProfile(
            name=self._pick_text(company, "name", "company_name", default=default.name),
            address=self._pick_text(
                company, "address", "company_address", "mailing_address", default=default.address
            ),
            email=self._pick_text(
                company, "email", "company_email", "contact_email", default=default.email
            ),
            phone=self._pick_text(
                company, "phone", "company_phone", "contact_phone", default=default.phone
            ),
            website=self._pick_text(
                company, "website", "company_website", "contact_website", default=default.website
            ),
        )

    def _normalize_candidate_and_job(self, candidate: Any, job: Any) -> tuple[str, str, str]:
        candidate_name = self._pick_text(
            candidate,
            "candidate_name",
            "full_name",
            "name",
            default="",
        )
        if not candidate_name:
            first_name = self._pick_text(candidate, "first_name", default="")
            last_name = self._pick_text(candidate, "last_name", default="")
            candidate_name = " ".join(part for part in [first_name, last_name] if part).strip()
        if not candidate_name:
            raise DocumentValidationError("Candidate name is required to generate a PDF document.")

        candidate_email = self._pick_text(candidate, "candidate_email", "email", default="")
        if not candidate_email:
            raise DocumentValidationError("Candidate email is required to generate a PDF document.")

        applied_position = self._pick_text(
            job,
            "applied_position",
            "job_title",
            "title",
            "position",
            "role",
            default="",
        )
        if not applied_position:
            raise DocumentValidationError("Applied position or job title is required to generate a PDF document.")

        return candidate_name, candidate_email, applied_position

    def _job_field(self, job: Any, field_name: str) -> str | None:
        value = self._extract_value(job, field_name)
        if value is not None:
            text = str(value).strip()
            return text or None
        return None

    def _job_department(self, job: Any) -> str | None:
        value = self._extract_value(job, "department")
        if value is not None and isinstance(value, str):
            text = value.strip()
            if text:
                return text
        if value is not None and hasattr(value, "name"):
            text = str(getattr(value, "name", "")).strip()
            if text:
                return text
        return self._job_field(job, "department_name")

    def _extract_value(self, source: Any, key: str) -> Any:
        if source is None:
            return None
        if isinstance(source, Mapping):
            return source.get(key)
        return getattr(source, key, None)

    def _pick_text(self, source: Any, *keys: str, default: str | None = None) -> str:
        for key in keys:
            value = self._extract_value(source, key)
            if value is None:
                continue
            if isinstance(value, str):
                text = value.strip()
                if text:
                    return text
            elif hasattr(value, "name"):
                name = getattr(value, "name", None)
                if isinstance(name, str) and name.strip():
                    return name.strip()
            else:
                text = str(value).strip()
                if text:
                    return text
        return default or ""

    def _normalize_issue_date(self, value: date | datetime | None) -> date:
        if value is None:
            return datetime.now(timezone.utc).date()
        if isinstance(value, datetime):
            return value.date()
        return value

    def _format_date(self, value: date | datetime | str | None) -> str:
        if value is None:
            return "To be confirmed"
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return "To be confirmed"
            try:
                return self._format_date(datetime.fromisoformat(text))
            except ValueError:
                return text
        if isinstance(value, datetime):
            value = value.date()
        return value.strftime("%B %d, %Y")

    def _slugify(self, value: str) -> str:
        normalized = unicodedata.normalize("NFKD", str(value or "candidate"))
        ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
        slug = re.sub(r"[^A-Za-z0-9]+", "_", ascii_text).strip("_")
        return slug or "candidate"

    def _build_reference_number(self, code: str, candidate_name: str, issue_date: date) -> str:
        initials = "".join(part[0] for part in candidate_name.split() if part).upper() or "CN"
        return f"SHAI-{code}-{issue_date:%Y%m%d}-{initials}"


_DEFAULT_GENERATOR: PdfGenerator | None = None


def _get_default_generator(report_root: str | Path | None = None) -> PdfGenerator:
    global _DEFAULT_GENERATOR
    if report_root is not None:
        return PdfGenerator(report_root=report_root)
    if _DEFAULT_GENERATOR is None:
        _DEFAULT_GENERATOR = PdfGenerator()
    return _DEFAULT_GENERATOR


def generate_offer_letter(
    candidate: Any,
    job: Any,
    recruiter_name: str,
    *,
    expected_start_date: date | datetime | str | None = None,
    employment_type: str | None = None,
    department: str | None = None,
    work_location: str | None = None,
    acceptance_instructions: Sequence[str] | None = None,
    reference_number: str | None = None,
    issue_date: date | datetime | None = None,
    company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    report_root: str | Path | None = None,
) -> GeneratedDocumentResult:
    return _get_default_generator(report_root).generate_offer_letter(
        candidate,
        job,
        recruiter_name,
        expected_start_date=expected_start_date,
        employment_type=employment_type,
        department=department,
        work_location=work_location,
        acceptance_instructions=acceptance_instructions,
        reference_number=reference_number,
        issue_date=issue_date,
        company=company,
    )


def generate_interview_letter(
    candidate: Any,
    job: Any,
    recruiter_name: str,
    *,
    interview_date: date | datetime | str | None = None,
    interview_time: str | None = None,
    interview_type: str | None = None,
    meeting_link: str | None = None,
    interviewer_name: str | None = None,
    preparation_instructions: Sequence[str] | None = None,
    reference_number: str | None = None,
    issue_date: date | datetime | None = None,
    company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    report_root: str | Path | None = None,
) -> GeneratedDocumentResult:
    return _get_default_generator(report_root).generate_interview_letter(
        candidate,
        job,
        recruiter_name,
        interview_date=interview_date,
        interview_time=interview_time,
        interview_type=interview_type,
        meeting_link=meeting_link,
        interviewer_name=interviewer_name,
        preparation_instructions=preparation_instructions,
        reference_number=reference_number,
        issue_date=issue_date,
        company=company,
    )


def generate_rejection_letter(
    candidate: Any,
    job: Any,
    recruiter_name: str,
    *,
    reference_number: str | None = None,
    issue_date: date | datetime | None = None,
    company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    report_root: str | Path | None = None,
) -> GeneratedDocumentResult:
    return _get_default_generator(report_root).generate_rejection_letter(
        candidate,
        job,
        recruiter_name,
        reference_number=reference_number,
        issue_date=issue_date,
        company=company,
    )


def generate_hold_letter(
    candidate: Any,
    job: Any,
    recruiter_name: str,
    *,
    reference_number: str | None = None,
    issue_date: date | datetime | None = None,
    company: CompanyProfile | Mapping[str, Any] | Any | None = None,
    report_root: str | Path | None = None,
) -> GeneratedDocumentResult:
    return _get_default_generator(report_root).generate_hold_letter(
        candidate,
        job,
        recruiter_name,
        reference_number=reference_number,
        issue_date=issue_date,
        company=company,
    )
