from __future__ import annotations

from datetime import datetime
from math import ceil
from typing import Any, Generic, Literal, TypeVar

from fastapi import Query
from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total_items: int
    total_pages: int


class CollectionQuery:
    def __init__(
        self,
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=100),
        status: str | None = None,
        company: int | None = None,
        department: int | None = None,
        location: str | None = None,
        category: int | None = None,
        experience: str | None = None,
        education: str | None = None,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
        search: str | None = Query(None, min_length=1),
        sort_by: str | None = None,
        sort_order: Literal["asc", "desc"] = "asc",
    ) -> None:
        self.__dict__.update(locals())
        del self.__dict__["self"]
        for name, value in tuple(self.__dict__.items()):
            if hasattr(value, "default"):
                self.__dict__[name] = value.default


def paginate(items: list[T], query: CollectionQuery) -> Page[T]:
    def value(item: Any, name: str) -> Any:
        return (
            getattr(item, name, None) if not isinstance(item, dict) else item.get(name)
        )

    field_map = {
        "company": "company_id",
        "department": "department_id",
        "category": "category_id",
        "experience": "experience_level",
    }
    filtered = items
    for query_name, field in field_map.items():
        expected = getattr(query, query_name)
        if expected is not None:
            filtered = [
                item
                for item in filtered
                if value(item, field) == expected
                or expected in (value(item, "category_ids") or [])
            ]
    for field in ("status", "location", "education"):
        expected = getattr(query, field)
        if expected:
            filtered = [
                item
                for item in filtered
                if expected.casefold()
                in str(value(item, field) or value(item, "degree") or "").casefold()
            ]
    if query.search:
        needle = query.search.casefold()
        filtered = [
            item
            for item in filtered
            if needle
            in " ".join(
                str(v)
                for v in (
                    item.values()
                    if isinstance(item, dict)
                    else item.model_dump().values()
                )
            ).casefold()
        ]
    for field in ("created_at", "updated_at"):
        expected = getattr(query, field)
        if expected:
            filtered = [
                item
                for item in filtered
                if value(item, field) and value(item, field) >= expected
            ]
    if query.sort_by:
        filtered.sort(
            key=lambda item: (
                value(item, query.sort_by) is None,
                value(item, query.sort_by),
            ),
            reverse=query.sort_order == "desc",
        )
    total = len(filtered)
    start = (query.page - 1) * query.page_size
    return Page(
        items=filtered[start : start + query.page_size],
        page=query.page,
        page_size=query.page_size,
        total_items=total,
        total_pages=ceil(total / query.page_size) if total else 0,
    )
