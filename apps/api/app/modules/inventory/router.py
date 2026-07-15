from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ForbiddenError
from app.modules.inventory import repository as inventory_repo
from app.modules.inventory import service as inventory_service
from app.modules.inventory.schemas import InventoryItemCreate, InventoryItemRead
from app.modules.users.models import ADMIN_ROLES, Role, User

router = APIRouter(prefix="/inventory/items", tags=["inventory"])


@router.post(
    "",
    response_model=InventoryItemRead,
    status_code=201,
    dependencies=[Depends(require_role(*ADMIN_ROLES, Role.RECEPTIONIST))],
)
async def create_inventory_item(
    payload: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InventoryItemRead:
    # gym_id nunca en el body: este endpoint no acepta ese campo en el schema
    # en absoluto (más fuerte que validarlo en runtime) — se deriva siempre
    # del staff autenticado, igual que members/router.py.
    if current_user.gym_id is None:
        raise ForbiddenError()
    item = await inventory_service.create_item(
        db, payload, gym_id=current_user.gym_id, created_by=current_user.id
    )
    return InventoryItemRead.model_validate(item)


@router.get("", response_model=list[InventoryItemRead])
async def list_inventory_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InventoryItemRead]:
    if current_user.gym_id is None:
        raise ForbiddenError()
    items = await inventory_repo.list_for_gym(db, current_user.gym_id)
    return [InventoryItemRead.model_validate(i) for i in items]
