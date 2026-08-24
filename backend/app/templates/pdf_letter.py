from __future__ import annotations

from typing import Iterable, Sequence

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, ListFlowable, ListItem, Paragraph, Table, TableStyle


def build_letter_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="LetterTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="LetterSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#475569"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="LetterMetaLabel",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#64748b"),
            uppercase=True,
            spaceAfter=2,
        )
    )
    styles.add(
        ParagraphStyle(
            name="LetterMetaValue",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#0f172a"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="LetterBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="LetterSection",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=10,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="LetterSmall",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#64748b"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="LetterSignature",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#0f172a"),
            alignment=TA_LEFT,
        )
    )

    return styles


def paragraph_text(text: str) -> str:
    return str(text or "").replace("\n", "<br/>")


def build_separator(thickness: float = 0.8) -> HRFlowable:
    return HRFlowable(
        width="100%",
        thickness=thickness,
        color=colors.HexColor("#e2e8f0"),
        spaceBefore=4,
        spaceAfter=8,
        lineCap="round",
    )


def build_key_value_table(
    rows: Sequence[tuple[str, str]],
    styles: dict[str, ParagraphStyle],
    col_widths: tuple[float, float] | None = None,
) -> Table:
    data = [
        [
            Paragraph(f"{label}", styles["LetterMetaLabel"]),
            Paragraph(paragraph_text(value), styles["LetterMetaValue"]),
        ]
        for label, value in rows
    ]
    table = Table(data, colWidths=col_widths or (48 * mm, 112 * mm), hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#e2e8f0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def build_body_paragraphs(texts: Iterable[str], styles: dict[str, ParagraphStyle]) -> list[Paragraph]:
    return [Paragraph(paragraph_text(text), styles["LetterBody"]) for text in texts if str(text or "").strip()]


def build_bullet_list(items: Sequence[str], styles: dict[str, ParagraphStyle]) -> ListFlowable:
    paragraphs = [
        ListItem(
            Paragraph(paragraph_text(item), styles["LetterBody"]),
            leftIndent=10,
        )
        for item in items
        if str(item or "").strip()
    ]
    return ListFlowable(
        paragraphs,
        bulletType="bullet",
        bulletColor=colors.HexColor("#0f172a"),
        leftIndent=16,
    )


def build_signature_table(
    primary_label: str,
    primary_name: str,
    secondary_label: str | None = None,
    secondary_name: str | None = None,
    styles: dict[str, ParagraphStyle] | None = None,
) -> Table:
    styles = styles or build_letter_styles()
    blocks = [
        Paragraph(f"<b>{primary_label}</b><br/><br/>______________________________<br/>{paragraph_text(primary_name or 'Authorized Signatory')}", styles["LetterSignature"])
    ]
    if secondary_label:
        blocks.append(
            Paragraph(
                f"<b>{secondary_label}</b><br/><br/>______________________________<br/>{paragraph_text(secondary_name or 'Candidate')}",
                styles["LetterSignature"],
            )
        )
    data = [blocks]
    width = 78 * mm
    widths = [width, width] if len(blocks) == 2 else [width]
    table = Table(data, colWidths=widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#e2e8f0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ]
        )
    )
    return table
