from __future__ import annotations

from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.talent_search import (
    TalentPoolFavorite,
    TalentPoolFavoriteCreate,
    ExportFormat,
    TalentSearchFilters,
    TalentSearchResponse,
)
from app.services.talent_search_service import TalentSearchService

router = APIRouter(prefix="/talent", tags=["talent search"])


def get_talent_search_service(db: Session = Depends(get_db)) -> TalentSearchService:
    return TalentSearchService(db)


@router.get("/search", response_model=TalentSearchResponse)
def search_talent_pool(
    filters: TalentSearchFilters = Depends(),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: TalentSearchService = Depends(get_talent_search_service),
) -> TalentSearchResponse:
    return service.search(current_user, filters)


@router.get("/filter", response_model=TalentSearchResponse)
def filter_talent_pool(
    filters: TalentSearchFilters = Depends(),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: TalentSearchService = Depends(get_talent_search_service),
) -> TalentSearchResponse:
    return service.filter(current_user, filters)


@router.get("/favorites", response_model=list[TalentPoolFavorite])
def list_talent_pool_favorites(
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: TalentSearchService = Depends(get_talent_search_service),
) -> list[TalentPoolFavorite]:
    return service.list_favorites(current_user)


@router.post("/favorites", response_model=TalentPoolFavorite, status_code=status.HTTP_201_CREATED)
def create_talent_pool_favorite(
    payload: TalentPoolFavoriteCreate,
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: TalentSearchService = Depends(get_talent_search_service),
) -> TalentPoolFavorite:
    return service.save_favorite(current_user, payload)


@router.delete("/favorites/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_talent_pool_favorite(
    favorite_id: UUID,
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: TalentSearchService = Depends(get_talent_search_service),
) -> None:
    service.delete_favorite(current_user, favorite_id)


@router.get("/export")
def export_talent_pool(
    filters: TalentSearchFilters = Depends(),
    report_format: ExportFormat = Query("json", alias="format"),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: TalentSearchService = Depends(get_talent_search_service),
) -> Response:
    content, media_type, filename = service.export(
        current_user,
        filters,
        report_format=report_format,
    )
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{Path(filename).name}"'},
    )
