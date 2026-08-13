from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ForbiddenError
from app.modules.inventory_sales import repository as sales_repo
from app.modules.inventory_sales import service as sales_service
from app.modules.inventory_sales.schemas import InventorySaleCreate, InventorySaleRead
from app.modules.users.models import ADMIN_ROLES, Role, User

router = APIRouter(prefix="/inventory/sales", tags=["inventory_sales"])


@router.post(
    "",
    response_model=InventorySaleRead,
    status_code=201,
    dependencies=[Depends(require_role(*ADMIN_ROLES, Role.RECEPTIONIST))],
)
async def create_inventory_sale(
    payload: InventorySaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InventorySaleRead:
    if current_user.gym_id is None:
        raise ForbiddenError()
    sale = await sales_service.create_sale(db, payload, gym_id=current_user.gym_id, registered_by=current_user.id)
    return InventorySaleRead.model_validate(sale)


@router.get(
    "",
    response_model=list[InventorySaleRead],
    dependencies=[Depends(require_role(*ADMIN_ROLES, Role.RECEPTIONIST))],
)
async def list_inventory_sales(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InventorySaleRead]:
    if current_user.gym_id is None:
        raise ForbiddenError()
    sales = await sales_repo.list_for_gym(db, current_user.gym_id)
    return [InventorySaleRead.model_validate(s) for s in sales]
