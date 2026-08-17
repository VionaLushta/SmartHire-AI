from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.pagination import CollectionQuery, Page, paginate
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.department import DepartmentCreate, DepartmentRead, DepartmentUpdate
from app.services.department_service import DepartmentService

router = APIRouter(prefix="/departments", tags=["departments"])


@router.post("", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DepartmentRead:
    service = DepartmentService(db)
    return service.create_department(payload, current_user)


@router.get("", response_model=Page[DepartmentRead])
def list_departments(
    query: CollectionQuery = Depends(),
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Page[DepartmentRead]:
    service = DepartmentService(db)
    return paginate(service.list_departments(current_user), query)


@router.get("/{department_id}", response_model=DepartmentRead)
def get_department(
    department_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DepartmentRead:
    service = DepartmentService(db)
    return service.get_department(department_id, current_user)


@router.put("/{department_id}", response_model=DepartmentRead)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DepartmentRead:
    service = DepartmentService(db)
    return service.update_department(department_id, payload, current_user)


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    service = DepartmentService(db)
    service.delete_department(department_id, current_user)
