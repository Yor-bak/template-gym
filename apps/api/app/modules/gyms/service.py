from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.gyms import repository as gyms_repo
from app.modules.gyms.models import Gym
from app.modules.gyms.schemas import GymCreate


async def create_gym(db: AsyncSession, payload: GymCreate) -> Gym:
    gym = Gym(**payload.model_dump())
    gym = await gyms_repo.create(db, gym=gym)
    await db.commit()
    return gym
