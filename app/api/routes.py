"""
FastAPI REST API
================
Exposes the PSX Portfolio Agent over HTTP.

Endpoints
---------
GET  /api/v1/health            — liveness check
POST /api/v1/portfolio/run     — trigger full agent pipeline
GET  /api/v1/portfolio/{id}    — fetch a previously built portfolio
GET  /api/v1/market/snapshot   — latest PSX market data only
GET  /api/v1/news              — latest scraped news articles
GET  /api/v1/signals           — extracted signals (last run)
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import JSONResponse

from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
limiter = Limiter(key_func=get_remote_address)

from app.chain import ActionChain
from app.config import Settings, get_settings
from app.logger import get_logger
from app.models import (
    AgentRun,
    HealthResponse,
    RiskLevel,
    RunPortfolioRequest,
)
from app.store import RunStore

logger = get_logger(__name__)
router = APIRouter()


# ─── Dependency: in-memory run store ─────────────────────────────────────────

def get_store() -> RunStore:
    return RunStore.instance()


# ─── Health ───────────────────────────────────────────────────────────────────

@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Liveness check",
)
async def health(cfg: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(version=cfg.app_version, environment=cfg.environment)


# ─── Portfolio ────────────────────────────────────────────────────────────────

@limiter.limit("5/minute")
@router.post(
    "/portfolio/run",
    response_model=AgentRun,
    tags=["Portfolio"],
    summary="Trigger the full agent pipeline",
    status_code=202,
)
async def run_portfolio(
    request: Request,
    body: RunPortfolioRequest,
    background_tasks: BackgroundTasks,
    store: RunStore = Depends(get_store),
    cfg: Settings = Depends(get_settings),
) -> AgentRun:
    """
    Launches the 5-step action chain asynchronously.
    Returns the initial AgentRun stub immediately (status=in_progress).
    Poll ``GET /portfolio/{run_id}`` for completion.
    """
    from app.models import ActionStatus
    import uuid
    from datetime import datetime, timezone

    run_id = str(uuid.uuid4())
    # Store a pending stub so the client can start polling immediately
    stub = AgentRun(
        run_id=run_id,
        status=ActionStatus.IN_PROGRESS,
        created_at=datetime.now(tz=timezone.utc),
    )
    store.save(stub)

    async def _execute() -> None:
        chain = ActionChain()
        try:
            result = await chain.execute(
                capital_pkr=body.capital_pkr,
                max_positions=body.max_positions,
                risk_preference=body.risk_preference,
                tickers_filter=body.tickers_filter or None,
            )
            result.run_id = run_id  # keep the pre-issued ID
            store.save(result)
            logger.info("api.run_complete", run_id=run_id)
        except Exception as exc:
            stub.status = ActionStatus.FAILED
            store.save(stub)
            logger.error("api.run_failed", run_id=run_id, error=str(exc))

    background_tasks.add_task(_execute)
    return stub


@router.get(
    "/portfolio/{run_id}",
    response_model=AgentRun,
    tags=["Portfolio"],
    summary="Fetch a portfolio run by ID",
)
async def get_portfolio_run(
    run_id: str,
    store: RunStore = Depends(get_store),
) -> AgentRun:
    run = store.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")
    return run


@router.get(
    "/portfolio",
    response_model=list[AgentRun],
    tags=["Portfolio"],
    summary="List recent portfolio runs",
)
async def list_portfolio_runs(
    limit: int = Query(10, ge=1, le=100),
    store: RunStore = Depends(get_store),
) -> list[AgentRun]:
    return store.list_recent(limit)


# ─── Market data ──────────────────────────────────────────────────────────────

@router.get(
    "/market/snapshot",
    tags=["Market"],
    summary="Fetch live PSX market snapshot",
)
async def market_snapshot() -> JSONResponse:
    from app.scrapers.psx_scraper import PSXScraper
    try:
        async with PSXScraper() as scraper:
            snap = await scraper.scrape()
        return JSONResponse(content=snap.model_dump(mode="json"))
    except Exception as exc:
        logger.error("api.market_snapshot_failed", error=str(exc))
        raise HTTPException(status_code=502, detail=f"PSX scrape failed: {exc}")


# ─── News ────────────────────────────────────────────────────────────────────

@router.get(
    "/news",
    tags=["News"],
    summary="Fetch latest business news articles",
)
async def latest_news(
    limit: int = Query(30, ge=1, le=100),
) -> JSONResponse:
    from app.scrapers.news_scraper import NewsScraper
    try:
        async with NewsScraper() as scraper:
            articles = await scraper.scrape()
        return JSONResponse(
            content=[a.model_dump(mode="json") for a in articles[:limit]]
        )
    except Exception as exc:
        logger.error("api.news_failed", error=str(exc))
        raise HTTPException(status_code=502, detail=f"News scrape failed: {exc}")


# ─── Signals ─────────────────────────────────────────────────────────────────

@router.get(
    "/signals/{run_id}",
    tags=["Signals"],
    summary="Get extracted signals for a run",
)
async def get_signals(
    run_id: str,
    store: RunStore = Depends(get_store),
) -> JSONResponse:
    run = store.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")
    return JSONResponse(
        content={
            "signals": [s.model_dump(mode="json") for s in run.signals],
            "conflicts": [c.model_dump(mode="json") for c in run.conflict_reports],
        }
    )
