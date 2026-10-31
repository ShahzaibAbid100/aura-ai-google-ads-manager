import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models.entities  # noqa: F401
from app.api.v1.routes import router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
settings = get_settings()
app = FastAPI(title="Aura AI Google Ads Manager", version="0.1.0", description="Mock-first campaign planning and safe Google Ads workflow API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Actor", "Idempotency-Key"],
)
app.include_router(router, prefix="/api/v1")
app.router.on_startup.append(lambda: Base.metadata.create_all(bind=engine))