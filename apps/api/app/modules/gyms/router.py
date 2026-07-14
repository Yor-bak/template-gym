from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.core.database import get_db
from app.modules.gyms import repository as gyms_repo
from app.modules.gyms import service as gyms_service
from app.modules.gyms.schemas import GymCreate, GymRead
from app.modules.users.models import Role

router = APIRouter(prefix="/gyms", tags=["gyms"])

# Crear/borrar sucursales es exclusivo de platform_admin — igual que
# "gyms_write_platform_admin" en el schema.sql original.
_platform_admin_only = Depends(require_role(Role.PLATFORM_ADMIN))


@router.post("", response_model=GymRead, status_code=201, dependencies=[_platform_admin_only])
async def create_gym(payload: GymCreate, db: AsyncSession = Depends(get_db)) -> GymRead:
    gym = await gyms_service.create_gym(db, payload)
    return GymRead.model_validate(gym)


@router.get("", response_model=list[GymRead], dependencies=[_platform_admin_only])
async def list_gyms(db: AsyncSession = Depends(get_db)) -> list[GymRead]:
    gyms = await gyms_repo.list_all(db)
    return [GymRead.model_validate(g) for g in gyms]
