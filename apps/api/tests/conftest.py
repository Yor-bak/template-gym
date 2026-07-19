import hashlib
import os
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# TEST_DATABASE_URL: Postgres real (no SQLite) — el schema usa índices únicos
# parciales y checks que SQLite no replica fielmente. Ver plan de Fase 1.
# Por defecto usa una base separada "gym_test" en el mismo servidor de DATABASE_URL.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://gym:changeme@localhost:5432/gym_test")

os.environ.setdefault("DATABASE_URL", TEST_DATABASE_URL)
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("CORS_ORIGINS", "")

from app.core.base_model import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.modules.gyms.models import Gym  # noqa: E402
from app.modules.members.models import Member, generate_activation_code  # noqa: E402
from app.modules.users.models import Role, User  # noqa: E402
from app.core.security import hash_password  # noqa: E402

# NullPool: pytest-asyncio crea un event loop nuevo por test (function-scoped
# por defecto); un engine con pool persistente reutilizaría conexiones asyncpg
# atadas al loop de un test anterior, causando "another operation is in
# progress" en el segundo test que corriera. Con NullPool cada checkout abre
# una conexión nueva, así que nunca cruza de un loop a otro.
test_engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
TestSessionFactory = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionFactory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    from app.core.database import get_db
    from app.core.limiter import limiter

    # El rate limit de /auth/login (5/minute, slowapi) es real y deseado en
    # producción, pero un solo test run hace muchos más de 5 logins desde el
    # mismo IP de test — sin esto, la suite completa se vuelve inestable
    # apenas se corre más de un test que loguea. Se desactiva solo para
    # tests, nunca para la app real.
    limiter.enabled = False

    # Una sesión nueva por request, igual que get_db en producción — no
    # reutilizar `db_session` aquí. Reutilizarla rompía cualquier test que
    # hiciera 2+ requests HTTP seguidos: el `async with db.begin()` explícito
    # de los services (p. ej. activation/service.py) deja la sesión con una
    # transacción autobegin abierta después del primer commit, y el segundo
    # request fallaba con "A transaction is already begun on this Session"
    # al intentar abrir la suya. `db_session` sigue siendo la sesión que usan
    # los tests directamente (factories, asserts contra la BD).
    async def override_get_db():
        async with TestSessionFactory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Factories mínimas — funciones simples, no hace falta factory_boy para este
# tamaño de suite (ver plan de Fase 1, sección Testing).
# ---------------------------------------------------------------------------


async def make_gym(db: AsyncSession, **overrides) -> Gym:
    defaults = dict(name="Test Gym", slug=f"test-gym-{uuid.uuid4().hex[:6]}", member_prefix="TG")
    gym = Gym(**{**defaults, **overrides})
    db.add(gym)
    await db.flush()
    return gym


def phone_from_email(email: str) -> str:
    """Deriva un teléfono determinístico de 10 dígitos a partir de un email
    — SOLO para tests. Desde que phone es el identificador de login (no
    email, decisión 2026-07-17), esto deja que los ~45 call-sites
    existentes de _login(client, email, password) en los distintos archivos
    de test sigan funcionando sin tocarlos uno por uno: _login internamente
    convierte el email a este mismo teléfono antes de mandarlo."""
    n = int(hashlib.sha256(email.encode()).hexdigest(), 16) % 10_000_000_000
    return f"{n:010d}"


async def make_user(db: AsyncSession, *, role: Role, gym_id=None, password: str = "password123", **overrides) -> tuple[User, str]:
    defaults = dict(
        email=f"{uuid.uuid4().hex[:8]}@test.com",
        full_name="Test User",
        role=role,
        gym_id=gym_id,
    )
    merged = {**defaults, **overrides}
    merged.setdefault("phone", phone_from_email(merged.get("email") or uuid.uuid4().hex))
    user = User(password_hash=hash_password(password), **merged)
    db.add(user)
    await db.flush()
    return user, password


async def make_member(db: AsyncSession, *, gym_id, **overrides) -> Member:
    defaults = dict(
        first_name="Cliente",
        last_name="De Prueba",
        phone="5500000000",
        member_number=f"TG-{uuid.uuid4().hex[:5]}",
        activation_code=generate_activation_code(),
    )
    member = Member(gym_id=gym_id, **{**defaults, **overrides})
    db.add(member)
    await db.flush()
    return member


@pytest.fixture
def factories():
    return {"gym": make_gym, "user": make_user, "member": make_member}
