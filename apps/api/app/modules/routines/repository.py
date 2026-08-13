import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.routines.models import Routine, RoutineExercise, WorkoutLog


async def get_by_id(db: AsyncSession, routine_id: uuid.UUID) -> Routine | None:
    result = await db.execute(select(Routine).where(Routine.id == routine_id))
    return result.scalar_one_or_none()


async def get_personalized_for_client(db: AsyncSession, client_id: uuid.UUID) -> Routine | None:
    result = await db.execute(
        select(Routine).where(Routine.client_id == client_id).order_by(Routine.created_at.desc())
    )
    return result.scalars().first()


async def list_generic_for_gym(db: AsyncSession, gym_id: uuid.UUID) -> list[Routine]:
    result = await db.execute(
        select(Routine)
        .where(Routine.gym_id == gym_id, Routine.client_id.is_(None), Routine.muscle_group.is_not(None))
        .order_by(Routine.created_at)
    )
    return list(result.scalars().all())


async def list_exercises(db: AsyncSession, routine_id: uuid.UUID) -> list[RoutineExercise]:
    result = await db.execute(
        select(RoutineExercise)
        .where(RoutineExercise.routine_id == routine_id)
        .order_by(RoutineExercise.order_index)
    )
    return list(result.scalars().all())


async def list_workout_logs_for_member(db: AsyncSession, member_id: uuid.UUID) -> list[WorkoutLog]:
    result = await db.execute(
        select(WorkoutLog).where(WorkoutLog.member_id == member_id).order_by(WorkoutLog.completed_date.desc())
    )
    return list(result.scalars().all())
