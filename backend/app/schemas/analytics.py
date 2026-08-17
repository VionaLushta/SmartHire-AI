from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AnalyticsPoint(BaseModel):
    label: str
    value: float = Field(ge=0)


class AnalyticsDashboardResponse(BaseModel):
    scope: str
    metrics: dict[str, Any]
    funnel: list[AnalyticsPoint]
    top_candidates: list[dict[str, Any]] = []
    skill_gap_analysis: dict[str, list[AnalyticsPoint]] = {}
    insights: list[str] = []
    charts: dict[str, list[AnalyticsPoint]] = {}
