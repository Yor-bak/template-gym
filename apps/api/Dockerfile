FROM python:3.12-slim

# asyncpg y bcrypt necesitan build tools en aarch64 (Raspberry Pi) si no hay
# wheel precompilado para la versión exacta de Python/arquitectura.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml ./
RUN uv pip install --system --no-cache -e .

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
