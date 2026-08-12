import uuid
from datetime import date, datetime, timezone

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.modules.members import repository as members_repo
from app.modules.routines import repository as routines_repo
from app.modules.routines.models import GENERIC_MUSCLE_GROUPS, Routine, RoutineExercise, WorkoutLog
from app.modules.routines.schemas import RoutineUpsert, WorkoutLogCreate
from app.modules.trainer_clients import repository as trainer_clients_repo


async def get_personalized_routine_for_member(db: AsyncSession, member_id: uuid.UUID) -> Routine | None:
    routine = await routines_repo.get_personalized_for_client(db, member_id)
    if routine is None:
        return None
    routine.routine_exercises = await routines_repo.list_exercises(db, routine.id)  # type: ignore[attr-defined]
    return routine


async def ensure_generic_routines(db: AsyncSession, gym_id: uuid.UUID) -> list[Routine]:
    """Crea las 6 rutinas genéricas por grupo muscular la primera vez que se
    piden para un gimnasio — idempotente, así no hace falta seedearlas a
    mano por cada gym nuevo (ver GENERIC_MUSCLE_GROUPS)."""
    existing = await routines_repo.list_generic_for_gym(db, gym_id)
    if existing:
        for routine in existing:
            routine.routine_exercises = await routines_repo.list_exercises(db, routine.id)  # type: ignore[attr-defined]
        return existing

    created: list[Routine] = []
    for muscle_group, title in GENERIC_MUSCLE_GROUPS:
        routine = Routine(gym_id=gym_id, trainer_id=None, client_id=None, title=title, muscle_group=muscle_group)
        db.add(routine)
        created.append(routine)
    await db.commit()
    for routine in created:
        await db.refresh(routine)
        routine.routine_exercises = []  # type: ignore[attr-defined]
    return created


async def get_client_routine_for_trainer(
    db: AsyncSession, *, trainer_id: uuid.UUID, member_id: uuid.UUID
) -> Routine | None:
    link = await trainer_clients_repo.get_by_client_id(db, member_id)
    if link is None or link.trainer_id != trainer_id:
        raise ForbiddenError("Este cliente no está asignado a este entrenador.")
    return await get_personalized_routine_for_member(db, member_id)


async def upsert_client_routine(
    db: AsyncSession,
    *,
    trainer_id: uuid.UUID,
    gym_id: uuid.UUID,
    member_id: uuid.UUID,
    payload: RoutineUpsert,
) -> Routine:
    link = await trainer_clients_repo.get_by_client_id(db, member_id)
    if link is None or link.trainer_id != trainer_id:
        raise ForbiddenError("Este cliente no está asignado a este entrenador.")

    member = await members_repo.get_by_id(db, member_id)
    if member is None or member.gym_id != gym_id:
        raise NotFoundError("Member no encontrado")

    routine = await routines_repo.get_personalized_for_client(db, member_id)
    if routine is None:
        routine = Routine(
            gym_id=gym_id, trainer_id=trainer_id, client_id=member_id, title=payload.title, goal=payload.goal
        )
        db.add(routine)
        await db.flush()
    else:
        routine.title = payload.title
        routine.goal = payload.goal
        await db.execute(delete(RoutineExercise).where(RoutineExercise.routine_id == routine.id))

    for index, item in enumerate(payload.exercises):
        db.add(
            RoutineExercise(
                routine_id=routine.id,
                name=item.name,
                sets=item.sets,
                reps=item.reps,
                rest_seconds=item.rest_seconds,
                order_index=index,
                notes=item.notes,
                catalog_id=item.catalog_id,
            )
        )

    await db.commit()
    await db.refresh(routine)
    routine.routine_exercises = await routines_repo.list_exercises(db, routine.id)  # type: ignore[attr-defined]
    return routine


async def log_workout_completion(
    db: AsyncSession, *, member_id: uuid.UUID, gym_id: uuid.UUID, payload: WorkoutLogCreate
) -> WorkoutLog:
    log = WorkoutLog(
        gym_id=gym_id,
        member_id=member_id,
        routine_id=payload.routine_id,
        routine_title=payload.routine_title,
        completed_date=date.today(),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


async def list_workout_history(db: AsyncSession, member_id: uuid.UUID) -> list[WorkoutLog]:
    return await routines_repo.list_workout_logs_for_member(db, member_id)
