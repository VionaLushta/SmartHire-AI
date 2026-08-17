from __future__ import annotations

import csv
import json
from html import escape
from io import BytesIO, StringIO
from zipfile import ZIP_DEFLATED, ZipFile


class AnalyticsEngine:
    """Transforms aggregate recruitment data into explainable dashboard data."""

    funnel_order = (
        "Applications",
        "AI Screening",
        "Shortlisted",
        "Interviewed",
        "Accepted",
        "Rejected",
    )

    def build_dashboard(
        self,
        *,
        scope: str,
        metrics: dict,
        funnel_counts: dict[str, int],
        top_candidates: list[dict],
        requested_skills: list[dict],
        common_skills: list[dict],
        missing_skills: list[dict],
        monthly_applications: list[dict],
        ai_scores_by_job: list[dict],
    ) -> dict:
        funnel = self._funnel(funnel_counts)
        skill_gap_analysis = {
            "most_missing_skills": self._points(missing_skills),
            "most_common_skills": self._points(common_skills),
            "most_requested_skills": self._points(requested_skills),
        }
        charts = {
            "bar_chart_top_skills": self._points(requested_skills),
            "pie_chart_hiring_funnel": funnel,
            "line_chart_applications_per_month": self._points(monthly_applications),
            "radar_chart_ai_scores_by_job": self._points(ai_scores_by_job),
            "heatmap_skill_demand": self._points(requested_skills),
        }
        return {
            "scope": scope,
            "metrics": metrics,
            "funnel": funnel,
            "top_candidates": top_candidates,
            "skill_gap_analysis": skill_gap_analysis,
            "insights": self._insights(metrics, requested_skills, missing_skills),
            "charts": charts,
        }

    def _funnel(self, counts: dict[str, int]) -> list[dict]:
        total = counts.get("Applications", 0)
        return [
            {
                "label": label,
                "value": round((counts.get(label, 0) / total) * 100, 2) if total else 0,
            }
            for label in self.funnel_order
        ]

    @staticmethod
    def _points(rows: list[dict]) -> list[dict]:
        return [
            {"label": str(row["label"]), "value": float(row["value"] or 0)}
            for row in rows
        ]

    def _insights(
        self, metrics: dict, requested_skills: list[dict], missing_skills: list[dict]
    ) -> list[str]:
        insights: list[str] = []
        if missing_skills:
            insights.append(
                f"The most common candidate skill gap is {missing_skills[0]['label']}."
            )
        if requested_skills:
            insights.append(
                f"{requested_skills[0]['label']} is the most requested skill in the current job set."
            )
        applications = int(metrics.get("total_applications") or 0)
        active_jobs = int(metrics.get("active_jobs") or 0)
        if active_jobs:
            insights.append(
                f"Active jobs receive an average of {round(applications / active_jobs, 1)} applications each."
            )
        return insights or ["No analytics data is available yet."]

    def export(self, dashboard: dict, report_format: str) -> tuple[bytes, str, str]:
        rows = [
            {"section": "Metric", "label": key, "value": value}
            for key, value in dashboard["metrics"].items()
        ]
        rows.extend(
            {"section": "Funnel", "label": point["label"], "value": point["value"]}
            for point in dashboard["funnel"]
        )
        if report_format == "json":
            return (
                json.dumps(dashboard, default=str, indent=2).encode(),
                "application/json",
                "analytics.json",
            )
        if report_format == "csv":
            output = StringIO()
            writer = csv.DictWriter(output, fieldnames=("section", "label", "value"))
            writer.writeheader()
            writer.writerows(rows)
            return output.getvalue().encode(), "text/csv", "analytics.csv"
        if report_format == "excel":
            return (
                self._xlsx(rows),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "analytics.xlsx",
            )
        if report_format == "pdf":
            lines = ["SmartHire AI Analytics Report"] + [
                f"{row['section']} - {row['label']}: {row['value']}" for row in rows
            ]
            return self._pdf(lines), "application/pdf", "analytics.pdf"
        raise ValueError("Unsupported export format.")

    @staticmethod
    def _xlsx(rows: list[dict]) -> bytes:
        sheet_rows = [["Section", "Label", "Value"]] + [
            [str(row["section"]), str(row["label"]), str(row["value"])] for row in rows
        ]
        row_xml = "".join(
            "<row>"
            + "".join(
                f'<c t="inlineStr"><is><t>{escape(value)}</t></is></c>' for value in row
            )
            + "</row>"
            for row in sheet_rows
        )
        output = BytesIO()
        with ZipFile(output, "w", ZIP_DEFLATED) as archive:
            archive.writestr(
                "[Content_Types].xml",
                '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
            )
            archive.writestr(
                "_rels/.rels",
                '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
            )
            archive.writestr(
                "xl/workbook.xml",
                '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Analytics" sheetId="1" r:id="rId1"/></sheets></workbook>',
            )
            archive.writestr(
                "xl/_rels/workbook.xml.rels",
                '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
            )
            archive.writestr(
                "xl/worksheets/sheet1.xml",
                f'<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>{row_xml}</sheetData></worksheet>',
            )
        return output.getvalue()

    @staticmethod
    def _pdf(lines: list[str]) -> bytes:
        text = "\\n".join(
            f"({line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')}) Tj 0 -16 Td"
            for line in lines[:45]
        )
        stream = f"BT /F1 11 Tf 50 760 Td {text} ET".encode()
        objects = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            b"<< /Length "
            + str(len(stream)).encode()
            + b" >>\nstream\n"
            + stream
            + b"\nendstream",
        ]
        output = bytearray(b"%PDF-1.4\n")
        offsets = [0]
        for index, obj in enumerate(objects, 1):
            offsets.append(len(output))
            output.extend(f"{index} 0 obj\n".encode() + obj + b"\nendobj\n")
        start = len(output)
        output.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
        output.extend(
            b"".join(f"{offset:010} 00000 n \n".encode() for offset in offsets[1:])
        )
        output.extend(
            f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF".encode()
        )
        return bytes(output)
