from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.modules.members import repository as members_repo
from app.modules.trainer_clients import repository as trainer_clients_repo
from app.modules.trainer_clients import service as trainer_clients_service
from app.modules.trainer_clients.schemas import (
    LinkClientRequest,
    MyTrainerRead,
    TrainerClientMemberRead,
    TrainerClientRead,
)
from app.modules.users import repository as users_repo
from app.modules.users.models import Role, User

router = APIRouter(prefix="/trainer", tags=["trainer_clients"])


@router.post(
    "/link-client",
    response_model=TrainerClientRead,
    status_code=201,
    dependencies=[Depends(require_role(Role.TRAINER))],
)
async def link_client(
    payload: LinkClientRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrainerClientRead:
    link = await trainer_clients_service.link_client(db, token=payload.token, trainer=current_user)
    return TrainerClientRead.model_validate(link)


@router.get(
    "/my-clients",
    response_model=list[TrainerClientMemberRead],
    dependencies=[Depends(require_role(Role.TRAINER))],
)
async def list_my_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TrainerClientMemberRead]:
    links = await trainer_clients_repo.list_for_trainer(db, current_user.id)
    members = []
    for link in links:
        member = await members_repo.get_by_id(db, link.client_id)
        if member is not None:
            members.append(member)
    return [TrainerClientMemberRead.model_validate(m) for m in members]


@router.get(
    "/my-trainer",
    response_model=MyTrainerRead | None,
    dependencies=[Depends(require_role(Role.CLIENT))],
)
async def get_my_trainer(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MyTrainerRead | None:
    member = await members_repo.get_by_user_id(db, current_user.id)
    if member is None:
        raise NotFoundError("No se encontró tu ficha de member.")
    link = await trainer_clients_repo.get_by_client_id(db, member.id)
    if link is None:
        return None
    trainer = await users_repo.get_by_id(db, link.trainer_id)
    return MyTrainerRead.model_validate(trainer) if trainer else None
