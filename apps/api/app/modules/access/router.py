from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.core.database import get_db
from app.modules.access import repository as access_repo
from app.modules.access import service as access_service
from app.modules.access.schemas import AccessLogRead, QrTokenRead, ScanRequest
from app.modules.users.models import ADMIN_ROLES, STAFF_ROLES, Role, User

router = APIRouter(prefix="/access", tags=["access"])


@router.post("/my-qr-token", response_model=QrTokenRead)
async def get_my_qr_token(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QrTokenRead:
    return await access_service.generate_my_qr_token(db, current_user=current_user)


@router.post(
    "/scan",
    response_model=AccessLogRead,
    dependencies=[Depends(require_role(*ADMIN_ROLES, Role.RECEPTIONIST))],
)
async def scan_access(
    payload: ScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccessLogRead:
    log = await access_service.scan_access(
        db, token=payload.token, reader=payload.reader, scanning_staff=current_user
    )
    return AccessLogRead.model_validate(log)


@router.get(
    "/logs",
    response_model=list[AccessLogRead],
    dependencies=[Depends(require_role(*STAFF_ROLES))],
)
async def list_access_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AccessLogRead]:
    if current_user.gym_id is None:
        return []
    logs = await access_repo.list_for_gym(db, current_user.gym_id)
    return [AccessLogRead.model_validate(log) for log in logs]
