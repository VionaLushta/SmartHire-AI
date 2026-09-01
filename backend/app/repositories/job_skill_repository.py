from __future__ import annotations

from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.orm import Session

from app.core.skill_library import SKILL_LIBRARY
from app.models.job import Job, JobSkill
from app.models.skill import Skill


class JobSkillRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_job(self, job_id: int) -> dict | None:
        row = (
            self.db.execute(select(Job.__table__).where(Job.__table__.c.job_id == job_id))
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def get_skill_by_id(self, skill_id: int) -> dict | None:
        row = (
            self.db.execute(
                select(Skill.__table__).where(Skill.__table__.c.skill_id == skill_id)
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def get_skill_by_name(self, name: str) -> dict | None:
        normalized = name.strip().casefold()
        row = (
            self.db.execute(
                select(Skill.__table__).where(
                    func.lower(Skill.__table__.c.name) == normalized
                )
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def list_job_skills(self, job_id: int) -> list[dict]:
        statement = (
            select(
                JobSkill.__table__.c.id,
                JobSkill.__table__.c.job_id,
                JobSkill.__table__.c.skill_id,
                JobSkill.__table__.c.is_required,
                JobSkill.__table__.c.required_level,
                Skill.__table__.c.name,
                Skill.__table__.c.category,
            )
            .select_from(
                JobSkill.__table__.join(
                    Skill.__table__,
                    Skill.__table__.c.skill_id == JobSkill.__table__.c.skill_id,
                )
            )
            .where(JobSkill.__table__.c.job_id == job_id)
            .order_by(
                JobSkill.__table__.c.is_required.desc(),
                Skill.__table__.c.name.asc(),
            )
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def list_skills(self) -> list[dict]:
        statement = (
            select(Skill.__table__)
            .order_by(
                func.coalesce(Skill.__table__.c.category, "").asc(),
                Skill.__table__.c.name.asc(),
            )
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def seed_skill_library(self) -> int:
        created = 0
        for category, skills in SKILL_LIBRARY:
            for name in skills:
                if self.get_skill_by_name(name) is not None:
                    continue
                self.db.execute(
                    insert(Skill.__table__).values(name=name, category=category)
                )
                created += 1
        if created:
            self.db.commit()
        return created

    def get_job_skill(self, job_id: int, skill_id: int) -> dict | None:
        statement = select(JobSkill.__table__).where(
            JobSkill.__table__.c.job_id == job_id,
            JobSkill.__table__.c.skill_id == skill_id,
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def create_or_update_job_skill(
        self,
        job_id: int,
        *,
        name: str,
        category: str | None,
        is_required: bool,
        required_level: int | None,
    ) -> dict:
        skill = self.get_skill_by_name(name)
        if skill is None:
            row = (
                self.db.execute(
                    insert(Skill.__table__)
                    .values(name=name.strip(), category=category)
                    .returning(*Skill.__table__.c)
                )
                .mappings()
                .one()
            )
            skill = dict(row)
            self.db.commit()
        elif category is not None and skill.get("category") != category:
            row = (
                self.db.execute(
                    update(Skill.__table__)
                    .where(Skill.__table__.c.skill_id == skill["skill_id"])
                    .values(category=category)
                    .returning(*Skill.__table__.c)
                )
                .mappings()
                .first()
            )
            skill = dict(row) if row else skill
            self.db.commit()

        existing = self.get_job_skill(job_id, skill["skill_id"])
        if existing is None:
            row = (
                self.db.execute(
                    insert(JobSkill.__table__)
                    .values(
                        job_id=job_id,
                        skill_id=skill["skill_id"],
                        is_required=is_required,
                        required_level=required_level,
                    )
                    .returning(*JobSkill.__table__.c)
                )
                .mappings()
                .one()
            )
            self.db.commit()
            return self._merge_skill(dict(row), skill)

        row = (
            self.db.execute(
                update(JobSkill.__table__)
                .where(JobSkill.__table__.c.id == existing["id"])
                .values(is_required=is_required, required_level=required_level)
                .returning(*JobSkill.__table__.c)
            )
            .mappings()
            .one()
        )
        self.db.commit()
        return self._merge_skill(dict(row), skill)

    def update_job_skill(
        self,
        job_id: int,
        skill_id: int,
        *,
        name: str | None = None,
        category: str | None = None,
        is_required: bool | None = None,
        required_level: int | None = None,
    ) -> dict | None:
        existing = self.get_job_skill(job_id, skill_id)
        if existing is None:
            return None

        skill = self.get_skill_by_id(skill_id)
        if skill is None:
            return None

        if name is not None or category is not None:
            skill_values = {}
            if name is not None:
                skill_values["name"] = name.strip()
            if category is not None:
                skill_values["category"] = category
            if skill_values:
                row = (
                    self.db.execute(
                        update(Skill.__table__)
                        .where(Skill.__table__.c.skill_id == skill_id)
                        .values(**skill_values)
                        .returning(*Skill.__table__.c)
                    )
                    .mappings()
                    .first()
                )
                if row:
                    skill = dict(row)

        link_values = {}
        if is_required is not None:
            link_values["is_required"] = is_required
        if required_level is not None:
            link_values["required_level"] = required_level
        if link_values:
            row = (
                self.db.execute(
                    update(JobSkill.__table__)
                    .where(
                        JobSkill.__table__.c.job_id == job_id,
                        JobSkill.__table__.c.skill_id == skill_id,
                    )
                    .values(**link_values)
                    .returning(*JobSkill.__table__.c)
                )
                .mappings()
                .first()
            )
            if row:
                existing = dict(row)
            self.db.commit()

        return self._merge_skill(existing, skill)

    def delete_job_skill(self, job_id: int, skill_id: int) -> bool:
        result = self.db.execute(
            delete(JobSkill.__table__).where(
                JobSkill.__table__.c.job_id == job_id,
                JobSkill.__table__.c.skill_id == skill_id,
            )
        )
        self.db.commit()
        return result.rowcount > 0

    @staticmethod
    def _merge_skill(link_row: dict, skill_row: dict) -> dict:
        merged = {**link_row, **skill_row}
        return merged
