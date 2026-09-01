from __future__ import annotations

from dataclasses import dataclass
from html import escape
from typing import Sequence


@dataclass(frozen=True)
class RenderedEmailTemplate:
    subject: str
    plain_text: str
    html_body: str


DEFAULT_COMPANY_NAME = "SmartHire AI"
DEFAULT_COMPANY_ADDRESS = "1200 Market Street, Suite 400, San Francisco, CA 94103"
DEFAULT_COMPANY_EMAIL = "smarthireaii@proton.me"
DEFAULT_COMPANY_PHONE = "+1 (555) 013-2048"
DEFAULT_COMPANY_WEBSITE = "www.smarthire.ai"


def render_welcome_email(
    *,
    display_name: str,
    login_url: str,
    company_name: str = DEFAULT_COMPANY_NAME,
    company_email: str = DEFAULT_COMPANY_EMAIL,
    company_website: str = DEFAULT_COMPANY_WEBSITE,
) -> RenderedEmailTemplate:
    """Render the post-verification welcome email sent to new accounts."""
    safe_name = escape(display_name or "there")
    safe_company_name = escape(company_name)
    safe_company_email = escape(company_email)
    safe_company_website = escape(company_website)
    safe_login_url = escape(login_url, quote=True)

    return RenderedEmailTemplate(
        subject="Welcome to SmartHire AI",
        plain_text=(
            f"Hello {display_name or 'there'},\n\n"
            f"Welcome to {company_name}. Your account is ready.\n\n"
            f"Sign in here: {login_url}\n\n"
            "You can now build your profile, discover relevant opportunities, and manage your applications.\n\n"
            f"If you did not create this account, please contact us at {company_email}.\n\n"
            f"{company_name}\n{company_website}"
        ),
        html_body=f"""
        <html>
          <body style="margin:0;padding:0;background:#eef4f8;color:#102a43;font-family:Arial,Helvetica,sans-serif;">
            <div style="max-width:680px;margin:0 auto;padding:36px 18px;">
              <div style="overflow:hidden;background:#ffffff;border:1px solid #d9e2ec;border-radius:20px;box-shadow:0 12px 30px rgba(16,42,67,.08);">
                <div style="padding:30px 34px;background:#102a43;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#9fb3c8;">{safe_company_name}</div>
                  <h1 style="margin:12px 0 0;font-size:32px;line-height:1.15;font-weight:700;">Your next opportunity starts here.</h1>
                </div>
                <div style="padding:34px;line-height:1.65;">
                  <p style="margin:0 0 16px;font-size:18px;">Hello {safe_name},</p>
                  <p style="margin:0 0 16px;">Welcome to SmartHire AI. Your account has been verified and is ready to help you move forward with confidence.</p>
                  <div style="margin:24px 0;padding:20px;border:1px solid #d9e2ec;border-radius:14px;background:#f7fafc;">
                    <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#627d98;">You are ready to</div>
                    <div style="margin-top:10px;color:#243b53;">Build your profile, discover relevant opportunities, and manage your applications in one place.</div>
                  </div>
                  <p style="margin:26px 0;text-align:center;">
                    <a href="{safe_login_url}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#d64545;color:#ffffff;text-decoration:none;font-weight:700;">Sign in to SmartHire AI</a>
                  </p>
                  <p style="margin:0 0 16px;font-size:13px;color:#627d98;word-break:break-all;">Button not working? Open this link:<br>{safe_login_url}</p>
                  <p style="margin:0 0 22px;font-size:13px;color:#627d98;">If you did not create this account, please contact us at {safe_company_email}.</p>
                  <div style="padding-top:18px;border-top:1px solid #e6edf3;font-size:12px;color:#829ab1;">{safe_company_name} | {safe_company_website}</div>
                </div>
              </div>
            </div>
          </body>
        </html>
        """.strip(),
    )


def render_offer_email(
    *,
    candidate_name: str,
    applied_position: str,
    recruiter_name: str,
    company_name: str = DEFAULT_COMPANY_NAME,
    company_address: str = DEFAULT_COMPANY_ADDRESS,
    company_email: str = DEFAULT_COMPANY_EMAIL,
    company_phone: str = DEFAULT_COMPANY_PHONE,
    company_website: str = DEFAULT_COMPANY_WEBSITE,
    body_lines: Sequence[str] | None = None,
) -> RenderedEmailTemplate:
    return _render_email(
        document_label="Offer of Employment",
        subject_label="Offer of Employment",
        candidate_name=candidate_name,
        applied_position=applied_position,
        recruiter_name=recruiter_name,
        company_name=company_name,
        company_address=company_address,
        company_email=company_email,
        company_phone=company_phone,
        company_website=company_website,
        body_lines=body_lines
        or [
            f"We are pleased to extend this formal offer for the {applied_position} position.",
            "Please review the attached offer letter for the full terms of employment.",
        ],
        closing_line="We look forward to welcoming you to SmartHire AI.",
        attachment_note="The offer letter PDF is attached to this email.",
    )


def render_interview_email(
    *,
    candidate_name: str,
    applied_position: str,
    recruiter_name: str,
    company_name: str = DEFAULT_COMPANY_NAME,
    company_address: str = DEFAULT_COMPANY_ADDRESS,
    company_email: str = DEFAULT_COMPANY_EMAIL,
    company_phone: str = DEFAULT_COMPANY_PHONE,
    company_website: str = DEFAULT_COMPANY_WEBSITE,
    body_lines: Sequence[str] | None = None,
) -> RenderedEmailTemplate:
    return _render_email(
        document_label="Interview Invitation",
        subject_label="Interview Invitation",
        candidate_name=candidate_name,
        applied_position=applied_position,
        recruiter_name=recruiter_name,
        company_name=company_name,
        company_address=company_address,
        company_email=company_email,
        company_phone=company_phone,
        company_website=company_website,
        body_lines=body_lines
        or [
            f"You have been selected for the next stage of the hiring process for the {applied_position} role.",
            "Please review the attached interview invitation for the scheduled details.",
        ],
        closing_line="We appreciate your continued interest in SmartHire AI.",
        attachment_note="The interview invitation PDF is attached to this email.",
    )


def render_rejection_email(
    *,
    candidate_name: str,
    applied_position: str,
    recruiter_name: str,
    company_name: str = DEFAULT_COMPANY_NAME,
    company_address: str = DEFAULT_COMPANY_ADDRESS,
    company_email: str = DEFAULT_COMPANY_EMAIL,
    company_phone: str = DEFAULT_COMPANY_PHONE,
    company_website: str = DEFAULT_COMPANY_WEBSITE,
    body_lines: Sequence[str] | None = None,
) -> RenderedEmailTemplate:
    return _render_email(
        document_label="Application Status Notice",
        subject_label="Application Status Notice",
        candidate_name=candidate_name,
        applied_position=applied_position,
        recruiter_name=recruiter_name,
        company_name=company_name,
        company_address=company_address,
        company_email=company_email,
        company_phone=company_phone,
        company_website=company_website,
        body_lines=body_lines
        or [
            f"Thank you for applying for the {applied_position} position at {company_name}.",
            "After careful consideration, we have decided to move forward with another candidate whose experience more closely aligns with the current role requirements.",
            "We sincerely appreciate the time and effort you invested in your application and encourage you to consider future opportunities with SmartHire AI.",
        ],
        closing_line="We wish you continued success in your job search.",
        attachment_note="The status notice PDF is attached to this email for your records.",
    )


def render_hold_email(
    *,
    candidate_name: str,
    applied_position: str,
    recruiter_name: str,
    company_name: str = DEFAULT_COMPANY_NAME,
    company_address: str = DEFAULT_COMPANY_ADDRESS,
    company_email: str = DEFAULT_COMPANY_EMAIL,
    company_phone: str = DEFAULT_COMPANY_PHONE,
    company_website: str = DEFAULT_COMPANY_WEBSITE,
    body_lines: Sequence[str] | None = None,
) -> RenderedEmailTemplate:
    return _render_email(
        document_label="Application On Hold",
        subject_label="Application On Hold",
        candidate_name=candidate_name,
        applied_position=applied_position,
        recruiter_name=recruiter_name,
        company_name=company_name,
        company_address=company_address,
        company_email=company_email,
        company_phone=company_phone,
        company_website=company_website,
        body_lines=body_lines
        or [
            f"Your application for the {applied_position} position remains under review.",
            "We appreciate your patience while our hiring team completes the evaluation process.",
            "If the role continues to advance, a recruiter may contact you with next steps.",
        ],
        closing_line="Thank you again for your interest in SmartHire AI.",
        attachment_note="The hold notice PDF is attached to this email.",
    )


def _render_email(
    *,
    document_label: str,
    subject_label: str,
    candidate_name: str,
    applied_position: str,
    recruiter_name: str,
    company_name: str,
    company_address: str,
    company_email: str,
    company_phone: str,
    company_website: str,
    body_lines: Sequence[str],
    closing_line: str,
    attachment_note: str,
) -> RenderedEmailTemplate:
    safe_candidate_name = escape(candidate_name)
    safe_applied_position = escape(applied_position)
    safe_recruiter_name = escape(recruiter_name)
    safe_company_name = escape(company_name)
    safe_company_address = escape(company_address)
    safe_company_email = escape(company_email)
    safe_company_phone = escape(company_phone)
    safe_company_website = escape(company_website)
    safe_body_lines = [escape(line) for line in body_lines if str(line or "").strip()]
    safe_closing_line = escape(closing_line)
    safe_attachment_note = escape(attachment_note)

    subject = f"SmartHire AI | {subject_label} - {candidate_name}"
    plain_lines = [
        company_name,
        document_label,
        "",
        f"Hello {candidate_name},",
        "",
        f"Applied position: {applied_position}",
        f"Recruiter: {recruiter_name}",
        "",
        *body_lines,
        "",
        attachment_note,
        "",
        closing_line,
        "",
        f"{company_name} | {company_email} | {company_phone} | {company_website}",
    ]

    html_paragraphs = "".join(
        f"<p style=\"margin:0 0 12px 0;\">{line}</p>" for line in safe_body_lines
    )
    html_body = f"""
    <html>
      <body style="margin:0; padding:0; background:#f8fafc; color:#0f172a; font-family:Arial, Helvetica, sans-serif;">
        <div style="max-width:720px; margin:0 auto; padding:32px 20px;">
          <div style="background:#ffffff; border:1px solid #e2e8f0; padding:28px; line-height:1.6;">
            <div style="border-bottom:1px solid #e2e8f0; padding-bottom:16px; margin-bottom:20px;">
              <div style="font-size:18px; font-weight:700; color:#0f172a;">{safe_company_name}</div>
              <div style="font-size:12px; color:#64748b; margin-top:4px;">{safe_company_address}</div>
            </div>
            <div style="font-size:11px; letter-spacing:0.16em; text-transform:uppercase; color:#64748b;">{escape(document_label)}</div>
            <h1 style="margin:8px 0 18px 0; font-size:24px; line-height:1.25; color:#0f172a;">{escape(subject_label)}</h1>
            <p style="margin:0 0 12px 0;">Hello {safe_candidate_name},</p>
            <p style="margin:0 0 12px 0;"><strong>Applied position:</strong> {safe_applied_position}</p>
            <p style="margin:0 0 12px 0;"><strong>Recruiter:</strong> {safe_recruiter_name}</p>
            {html_paragraphs}
            <div style="margin:18px 0; padding:14px 16px; border:1px solid #e2e8f0; background:#f8fafc; color:#475569;">{safe_attachment_note}</div>
            <p style="margin:0 0 18px 0;">{safe_closing_line}</p>
            <div style="padding-top:16px; border-top:1px solid #e2e8f0; font-size:12px; color:#64748b;">
              <div>{safe_company_name}</div>
              <div>{safe_company_email} | {safe_company_phone}</div>
              <div>{safe_company_website}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
    """.strip()

    return RenderedEmailTemplate(
        subject=subject,
        plain_text="\n".join(plain_lines).strip(),
        html_body=html_body,
    )
