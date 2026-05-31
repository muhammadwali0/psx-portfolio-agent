"""
FastAPI application factory.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import limiter, router
from app.bootstrap.startup import refresh_live_cache, run_bootstrap
from app.config import get_settings
from app.logger import configure_logging, get_logger

logger = get_logger(__name__)


async def _live_refresh_loop() -> None:
    """Refresh live quotes in Redis on TTL cadence (no SQLite, no user-request scrape)."""
    cfg = get_settings()
    interval = max(cfg.cache_ttl_seconds - 30, 60)
    while True:
        await asyncio.sleep(interval)
        await refresh_live_cache()


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

    skip_download = cfg.environment == "development" and cfg.debug
    try:
        await run_bootstrap(skip_download=skip_download)
    except Exception as exc:
        logger.error("bootstrap.failed", error=str(exc))
        if cfg.environment == "production":
            raise

    app.state.bootstrap_complete = True
    asyncio.create_task(_live_refresh_loop())

    yield
    logger.info("app.shutdown")


def create_app() -> FastAPI:
    cfg = get_settings()

    app = FastAPI(
        title=cfg.app_name,
        version=cfg.app_version,
        description=(
            "Autonomous PSX portfolio construction agent. "
            "Market data is loaded at startup into Redis/SQLite; "
            "user requests never hit PSX live except background cache refresh."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.state.bootstrap_complete = False
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    app.include_router(router, prefix=cfg.api_prefix)

    return app
