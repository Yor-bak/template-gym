"""Crea la primera sucursal + el primer usuario platform_admin, directo en la
base de datos. Necesario solo una vez: después de esto, todo lo demás se crea
vía la API normal (POST /gyms, POST /users), porque esos endpoints ya
requieren estar autenticado como platform_admin — sin este script no habría
forma de crear el primero.

Uso (desde apps/api, con el entorno activado):
    python -m scripts.seed_first_admin
"""

import asyncio
import getpass

from app.core.database import async_session_factory
from app.core.security import hash_password
from app.modules.gyms import repository as gyms_repo
from app.modules.gyms.models import Gym
from app.modules.users import repository as users_repo
from app.modules.users.models import Role, User


async def main() -> None:
    print("== Seed: primera sucursal + primer platform_admin ==")
    gym_name = input("Nombre de la sucursal [American Fitness]: ").strip() or "American Fitness"
    gym_slug = input("Slug (sin espacios) [american-fitness]: ").strip() or "american-fitness"
    member_prefix = input("Prefijo de miembros [AF]: ").strip() or "AF"

    admin_email = input("Correo del platform_admin: ").strip()
    admin_password = getpass.getpass("Contraseña del platform_admin: ")
    admin_name = input("Nombre completo: ").strip()

    async with async_session_factory() as db:
        existing = await users_repo.get_by_email(db, admin_email)
        if existing is not None:
            print(f"Ya existe una cuenta con el correo {admin_email}. Nada que hacer.")
            return

        gym = Gym(name=gym_name, slug=gym_slug, member_prefix=member_prefix)
        gym = await gyms_repo.create(db, gym=gym)

        admin = User(
            email=admin_email,
            password_hash=hash_password(admin_password),
            full_name=admin_name,
            role=Role.PLATFORM_ADMIN,
            gym_id=None,
        )
        await users_repo.create(db, user=admin)

        await db.commit()

    print(f"Listo. Sucursal '{gym_name}' y platform_admin '{admin_email}' creados.")


if __name__ == "__main__":
    asyncio.run(main())
