import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.modules.members import repository as members_repo
from app.modules.routines import service as routines_service
from app.modules.routines.schemas import RoutineRead, RoutineUpsert, WorkoutLogCreate, WorkoutLogRead
from app.modules.users.models import Role, User

router = APIRouter(prefix="/routines", tags=["routines"])
workout_logs_router = APIRouter(prefix="/workout-logs", tags=["routines"])


async def _my_member(db: AsyncSession, user: User):
    member = await members_repo.get_by_user_id(db, user.id)
    if member is None:
        raise NotFoundError("No se encontró tu ficha de member.")
    return member


@router.get("/mine", response_model=RoutineRead | None, dependencies=[Depends(require_role(Role.CLIENT))])
async def get_my_routine(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RoutineRead | None:
    member = await _my_member(db, current_user)
    routine = await routines_service.get_personalized_routine_for_member(db, member.id)
    return RoutineRead.model_validate(routine) if routine else None


@router.get("/generic", response_model=list[RoutineRead], dependencies=[Depends(require_role(Role.CLIENT))])
async def list_generic_routines(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RoutineRead]:
    member = await _my_member(db, current_user)
    routines = await routines_service.ensure_generic_routines(db, member.gym_id)
    return [RoutineRead.model_validate(r) for r in routines]


@router.get(
    "/client/{member_id}", response_model=RoutineRead | None, dependencies=[Depends(require_role(Role.TRAINER))]
)
async def get_client_routine(
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RoutineRead | None:
    routine = await routines_service.get_client_routine_for_trainer(
        db, trainer_id=current_user.id, member_id=member_id
    )
    return RoutineRead.model_validate(routine) if routine else None


@router.put(
    "/client/{member_id}", response_model=RoutineRead, dependencies=[Depends(require_role(Role.TRAINER))]
)
async def upsert_client_routine(
    member_id: uuid.UUID,
    payload: RoutineUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RoutineRead:
    if current_user.gym_id is None:
        raise ForbiddenError()
    routine = await routines_service.upsert_client_routine(
        db, trainer_id=current_user.id, gym_id=current_user.gym_id, member_id=member_id, payload=payload
    )
    return RoutineRead.model_validate(routine)


@workout_logs_router.post("", response_model=WorkoutLogRead, status_code=201, dependencies=[Depends(require_role(Role.CLIENT))])
async def log_workout(
    payload: WorkoutLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutLogRead:
    member = await _my_member(db, current_user)
    log = await routines_service.log_workout_completion(db, member_id=member.id, gym_id=member.gym_id, payload=payload)
    return WorkoutLogRead.model_validate(log)


@workout_logs_router.get("/mine", response_model=list[WorkoutLogRead], dependencies=[Depends(require_role(Role.CLIENT))])
async def list_my_workout_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkoutLogRead]:
    member = await _my_member(db, current_user)
    logs = await routines_service.list_workout_history(db, member.id)
    return [WorkoutLogRead.model_validate(l) for l in logs]
