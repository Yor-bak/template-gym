import uuid
from datetime import date, datetime

from pydantic import Field

from app.core.camel_model import CamelModel


class RoutineExerciseIn(CamelModel):
    name: str
    sets: int = Field(gt=0)
    reps: str
    rest_seconds: int | None = Field(default=None, ge=0)
    order_index: int = 0
    notes: str | None = None
    catalog_id: str | None = None


class RoutineExerciseRead(CamelModel):
    id: uuid.UUID
    routine_id: uuid.UUID
    name: str
    sets: int
    reps: str
    rest_seconds: int | None
    order_index: int
    notes: str | None
    catalog_id: str | None


class RoutineUpsert(CamelModel):
    title: str
    goal: str | None = None
    exercises: list[RoutineExerciseIn] = Field(default_factory=list)


class RoutineRead(CamelModel):
    id: uuid.UUID
    gym_id: uuid.UUID
    trainer_id: uuid.UUID | None
    client_id: uuid.UUID | None
    title: str
    goal: str | None
    muscle_group: str | None
    created_at: datetime
    routine_exercises: list[RoutineExerciseRead] = Field(default_factory=list)


class WorkoutLogCreate(CamelModel):
    routine_id: uuid.UUID | None = None
    routine_title: str


class WorkoutLogRead(CamelModel):
    id: uuid.UUID
    member_id: uuid.UUID
    routine_id: uuid.UUID | None
    routine_title: str
    completed_date: date
    completed_at: datetime
