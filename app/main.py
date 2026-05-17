"""
FastAPI application factory.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.api.routes import limiter
from app.api.routes import router
from app.config import get_settings
from app.logger import configure_logging, get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    cfg = get_settings()
    configure_logging(
        level=cfg.log_level,
        json_logs=cfg.environment == "production",
    )
    logger.info(
        "app.startup",
        name=cfg.app_name,
        version=cfg.app_version,
        environment=cfg.environment,
    )
    yield
    logger.info("app.shutdown")


def create_app() -> FastAPI:
    cfg = get_settings()

    app = FastAPI(
        title=cfg.app_name,
        version=cfg.app_version,
        description=(
            "Autonomous PSX portfolio construction agent. "
            "Scrapes market data & news, resolves signal conflicts, "
            "reasons with Gemini, and constructs a justified portfolio."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── Middleware ─────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # ── Routes ────────────────────────────────────────────────────────────────
    app.include_router(router, prefix=cfg.api_prefix)

    return app
