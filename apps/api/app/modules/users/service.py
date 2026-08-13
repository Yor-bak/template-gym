from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthzService
from app.core.exceptions import ConflictError, ForbiddenError
from app.core.security import hash_password
from app.modules.users import repository as users_repo
from app.modules.users.models import STAFF_ROLE_LIMITS, Role, User
from app.modules.users.schemas import UserCreate

# Roles que se pueden dar de alta por esta vía. GYM_ADMIN queda fuera a
# propósito: se crea automáticamente al aprovisionar el gimnasio (fase
# posterior, no implementada todavía), nunca manualmente desde este endpoint
# — mismo criterio que ya usaba el prototipo Next.js para excluir
# 'super_admin' de CREATABLE_ROLES en apps/web/app/api/staff/route.ts.
CREATABLE_ROLES = (Role.GYM_ADMIN_SECONDARY, Role.RECEPTIONIST, Role.TRAINER)


async def create_staff_user(db: AsyncSession, payload: UserCreate, *, authz: AuthzService) -> User:
    created_by = authz.user

    if payload.role not in CREATABLE_ROLES:
        raise ForbiddenError(
            f"El rol '{payload.role.value}' no se puede crear desde este endpoint."
        )

    # Solo GYM_ADMIN (el principal) o PLATFORM_ADMIN pueden dar de alta al
    # admin secundario — un GYM_ADMIN_SECONDARY no puede crear otro.
    if payload.role == Role.GYM_ADMIN_SECONDARY and created_by.role not in (
        Role.GYM_ADMIN,
        Role.PLATFORM_ADMIN,
    ):
        raise ForbiddenError("Solo el administrador principal puede crear un administrador secundario")

    # gym_id del nuevo usuario: se deriva de AuthzService.gym_scope(), NUNCA
    # del payload.gym_id que venga del cliente — gym_scope() devuelve None
    # solo si el caller es platform_admin (el único caso legítimo de
    # multi-sucursal), y en ese caso sí se respeta el gym_id explícito del
    # body. Para cualquier otro rol, el gym_id del body se ignora por
    # completo, sin excepción. Esta es la corrección de raíz del patrón que
    # causaba CRIT-01 en apps/web/app/api/staff/route.ts (que sí confiaba en
    # el gymId del body sin pasar por ninguna pieza equivalente a
    # gym_scope()). Ver DECISION_LOG_GYM.md, Bloque 1, decisión 2.
    scope = authz.gym_scope()
    target_gym_id = payload.gym_id if scope is None else scope
    if target_gym_id is None:
        raise ForbiddenError("gym_id es obligatorio para este rol")

    existing = await users_repo.get_by_phone(db, payload.phone)
    if existing is not None:
        raise ConflictError("Ya existe una cuenta con ese teléfono")

    # Límite de cuentas activas por rol — COUNT(*) y el INSERT posterior
    # ocurren en la misma transacción de la sesión (AsyncSession autobegin:
    # ya está abierta implícitamente desde el primer SELECT de esta función)
    # y solo se confirman juntos con el único db.commit() de abajo — un alta
    # concurrente no puede colar una cuenta de más entre el conteo y la
    # escritura porque ninguna de las dos operaciones es visible fuera de
    # esta transacción hasta el commit (mismo patrón que las guardas de
    # negocio server-side de admin-panel-j2ec: "COUNT(*) dentro de la misma
    # transacción antes de insertar").
    limit = STAFF_ROLE_LIMITS.get(payload.role)
    if limit is not None:
        active_count = await users_repo.count_active_by_gym_and_role(
            db, gym_id=target_gym_id, role=payload.role
        )
        if active_count >= limit:
            raise ConflictError(
                f"Este gimnasio ya alcanzó el límite de {limit} cuenta(s) activa(s) "
                f"con el rol '{payload.role.value}'."
            )

    user = User(
        phone=payload.phone,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        gym_id=target_gym_id,
    )
    user = await users_repo.create(db, user=user)
    await db.commit()
    return user
