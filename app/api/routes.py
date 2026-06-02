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

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from app.chain import ActionChain
from app.config import Settings, get_settings
from app.logger import get_logger
from app.models import (
    AgentRun,
    DataManifest,
    DataQualityFlag,
    HealthResponse,
    PrecomputedAggregates,
    RiskLevel,
    RunPortfolioRequest,
)
from app.chat.groq_chatbot import GroqChatbot
from app.data.store import MarketDataStore
from app.portfolio.scenario import PortfolioScenarioReport, ScenarioSimulator
from app.portfolio.sukuk_compare import SukukCompareService, SukukEquityComparison
from app.store import RunStore
from app.progress import ProgressManager

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


@router.get(
    "/data/manifest",
    response_model=DataManifest,
    tags=["Market"],
    summary="Bootstrap data manifest (Redis)",
)
async def data_manifest() -> DataManifest:
    store = MarketDataStore.get_instance()
    manifest = store.get_manifest()
    if not manifest:
        raise HTTPException(status_code=503, detail="Bootstrap not complete.")

    try:
        from app.historical.db import HistoricalDatabase
        from app.historical.news_store import NewsStore

        db = HistoricalDatabase()
        db.initialize()
        row_count = NewsStore.count_recent(db, days=90)
        manifest.sources["news_historical"] = DataQualityFlag(
            ok=row_count > 0,
            message="News articles in SQLite",
            row_count=row_count,
        )
    except Exception:
        manifest.sources["news_historical"] = DataQualityFlag(
            ok=False,
            message="News articles in SQLite",
            row_count=0,
        )

    return manifest


@router.get(
    "/data/aggregates",
    response_model=PrecomputedAggregates,
    tags=["Market"],
    summary="Pre-computed market aggregates (Redis)",
)
async def data_aggregates() -> PrecomputedAggregates:
    store = MarketDataStore.get_instance()
    agg = store.get_aggregates()
    if not agg:
        raise HTTPException(status_code=503, detail="Aggregates not available.")
    return agg


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
                investment_mode=body.investment_mode,
                tickers_filter=body.tickers_filter or None,
                shariah_mode=body.shariah_mode,
                run_id=run_id,
            )
            result.run_id = run_id  # keep the pre-issued ID
            store.save(result)
            logger.info("api.run_complete", run_id=run_id)
        except Exception as exc:
            stub.status = ActionStatus.FAILED
            store.save(stub)
            logger.error("api.run_failed", run_id=run_id, error=str(exc))
            await ProgressManager.get_instance().publish(run_id, f"FAILED: {exc}")

    background_tasks.add_task(_execute)
    return stub


@router.get(
    "/portfolio/run/stream/{run_id}",
    tags=["Portfolio"],
    summary="Stream real-time progress updates for a run",
)
async def stream_run_progress(run_id: str):
    async def event_generator():
        pm = ProgressManager.get_instance()
        async for msg in pm.subscribe(run_id):
            yield f"data: {msg}\n\n"
            if msg == "COMPLETE" or msg.startswith("FAILED:"):
                break

    return StreamingResponse(event_generator(), media_type="text/event-stream")


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
        snap = await PSXScraper().scrape()
        return JSONResponse(content=snap.model_dump(mode="json"))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("api.market_snapshot_failed", error=str(exc))
        raise HTTPException(status_code=503, detail=str(exc))


# ─── News ────────────────────────────────────────────────────────────────────

@router.get(
    "/news",
    tags=["News"],
    summary="Fetch latest business news articles",
)
async def latest_news(
    limit: int = Query(30, ge=1, le=100),
) -> JSONResponse:
    store = MarketDataStore.get_instance()
    articles = store.get_news_articles()
    if not articles:
        raise HTTPException(status_code=503, detail="News cache not available.")
    return JSONResponse(
        content=[a.model_dump(mode="json") for a in articles[:limit]]
    )


# ─── Chat (Groq) ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = []
    shariah_mode: bool = False


class ScenarioRequest(BaseModel):
    symbols: list[str]
    weights: dict[str, float] | None = None


@router.post("/chat", tags=["Chat"], summary="PSX Q&A via Groq (Redis data only)")
async def chat(body: ChatRequest) -> JSONResponse:
    try:
        reply = await GroqChatbot().chat(
            body.message, body.history, shariah_mode=body.shariah_mode
        )
        return JSONResponse(content={"reply": reply})
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("api.chat_failed", error=str(exc))
        raise HTTPException(status_code=502, detail=str(exc))


# ─── Scenario & Sukuk ─────────────────────────────────────────────────────────

@router.post(
    "/portfolio/scenario",
    response_model=PortfolioScenarioReport,
    tags=["Portfolio"],
    summary="Volatility stress test (Redis pre-computed vol)",
)
async def run_scenario(body: ScenarioRequest) -> PortfolioScenarioReport:
    try:
        return ScenarioSimulator().run(body.symbols, body.weights)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get(
    "/portfolio/sukuk-compare/{symbol}",
    response_model=SukukEquityComparison,
    tags=["Portfolio"],
    summary="GIS sukuk vs equity benchmark",
)
async def sukuk_compare(symbol: str) -> SukukEquityComparison:
    try:
        return SukukCompareService().compare(symbol)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


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
