"""
FastAPI application factory.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import limiter, router
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

    # ── API Routes ────────────────────────────────────────────────────────────
    app.include_router(router, prefix=cfg.api_prefix)

    # ── Frontend static files (only present after `npm run build`) ────────────
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    if os.path.isdir(static_dir):
        app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_frontend(_: str):
            return FileResponse(os.path.join(static_dir, "index.html"))

    return app
