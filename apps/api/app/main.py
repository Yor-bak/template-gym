from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.limiter import limiter
from app.modules.access.router import router as access_router
from app.modules.activation.router import router as activation_router
from app.modules.gyms.router import router as gyms_router
from app.modules.inventory.router import router as inventory_router
from app.modules.inventory_sales.router import router as inventory_sales_router
from app.modules.members.router import router as members_router
from app.modules.membership_plans.router import router as membership_plans_router
from app.modules.trainer_clients.router import router as trainer_clients_router
from app.modules.users.router import router as users_router
from app.auth.router import router as auth_router

settings = get_settings()

app = FastAPI(title="Template-GYM API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(activation_router)
app.include_router(gyms_router)
app.include_router(users_router)
app.include_router(membership_plans_router)
app.include_router(members_router)
app.include_router(inventory_router)
app.include_router(inventory_sales_router)
app.include_router(access_router)
app.include_router(trainer_clients_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
