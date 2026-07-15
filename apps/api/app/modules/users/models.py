import enum
import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import Base, TimestampMixin, UUIDPkMixin


class Role(str, enum.Enum):
    CLIENT = "client"
    TRAINER = "trainer"
    # Titular del gimnasio — se crea automáticamente al aprovisionar el
    # gimnasio (fuera de alcance de Fase 1), nunca vía POST /users.
    GYM_ADMIN = "gym_admin"
    # Máximo 1 activo por gimnasio, creado solo por GYM_ADMIN (o
    # PLATFORM_ADMIN) — ver DECISION_LOG_GYM.md, Bloque 1, decisión 1.
    GYM_ADMIN_SECONDARY = "gym_admin_secondary"
    # Máximo 2 activos por gimnasio.
    RECEPTIONIST = "receptionist"
    PLATFORM_ADMIN = "platform_admin"


# Roles con privilegios de administrador de gimnasio (nivel de acceso
# equivalente entre sí, salvo por quién puede crear/desactivar a quién —
# ver users/service.py). Se usa donde antes solo existía Role.ADMIN.
ADMIN_ROLES = (Role.GYM_ADMIN, Role.GYM_ADMIN_SECONDARY)

STAFF_ROLES = (Role.GYM_ADMIN, Role.GYM_ADMIN_SECONDARY, Role.RECEPTIONIST, Role.PLATFORM_ADMIN)

# Límites de cuentas activas por gimnasio (None = sin límite). Validados
# server-side con COUNT(*) dentro de la misma transacción de alta — ver
# users/service.py:create_staff_user. Nunca confiar solo en la UI.
STAFF_ROLE_LIMITS: dict[Role, int | None] = {
    Role.GYM_ADMIN_SECONDARY: 1,
    Role.RECEPTIONIST: 2,
    Role.TRAINER: None,
}

# native_enum=False: se guarda como varchar + CHECK, igual que el `check (role in (...))`
# del schema.sql original — evita el manejo aparte que exige un tipo ENUM nativo de Postgres
# en las migraciones (agregar un valor nuevo requiere ALTER TYPE, más fricción).
# values_callable es obligatorio aquí: sin él, SQLAlchemy guarda el .name del
# enum ("PLATFORM_ADMIN") en vez del .value ("platform_admin"), lo cual rompe
# el CHECK constraint de abajo (y no coincidiría con los roles en minúscula
# que usa el resto del código/JWT).
RoleType = SAEnum(
    Role,
    name="user_role",
    native_enum=False,
    validate_strings=True,
    values_callable=lambda enum_cls: [member.value for member in enum_cls],
)


class User(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        # Solo platform_admin puede no pertenecer a una sucursal específica,
        # igual que `profiles_gym_required` en el schema de Supabase.
        CheckConstraint(
            "role = 'platform_admin' OR gym_id IS NOT NULL",
            name="users_gym_required",
        ),
    )

    gym_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gyms.id", ondelete="SET NULL")
    )
    role: Mapped[Role] = mapped_column(RoleType, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str | None] = mapped_column(String)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
