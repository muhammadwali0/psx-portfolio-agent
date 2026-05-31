"""FastAPI lifespan bootstrap: SQLite ingest, live scrape, Redis pre-compute."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from app.bootstrap.precompute import attach_historical_to_snapshot, build_precomputed_aggregates
from app.data.store import MarketDataStore
from app.historical.download import DailyDownloadService
from app.logger import get_logger
from app.models import DataManifest, DataQualityFlag, MarketSnapshot
from app.scrapers.corporate_scraper import CorporateScraper
from app.scrapers.gis_scraper import GISScraper
from app.scrapers.market_scraper import MarketScraper
from app.scrapers.news_scraper import NewsScraper
from app.scrapers.snapshot_assembly import apply_corporate_data

logger = get_logger(__name__)
PKT = ZoneInfo("Asia/Karachi")


async def _fetch_live_snapshot() -> MarketSnapshot:
    """Run market, corporate, and GIS scrapers (bootstrap / background refresh only)."""
    market_result, corporate_result, gis_result = await asyncio.gather(
        _scrape_market(),
        _scrape_corporate(),
        _scrape_gis(),
        return_exceptions=True,
    )

    snapshot = MarketSnapshot(scraped_at=datetime.now(tz=UTC))

    if isinstance(market_result, Exception):
        logger.warning("bootstrap.market_failed", error=str(market_result))
    else:
        snapshot.quotes = market_result

    if isinstance(corporate_result, Exception):
        logger.warning("bootstrap.corporate_failed", error=str(corporate_result))
    else:
        apply_corporate_data(snapshot, corporate_result)

    if isinstance(gis_result, Exception):
        logger.warning("bootstrap.gis_failed", error=str(gis_result))
    else:
        snapshot.gis = gis_result

    return snapshot


async def _scrape_market():
    async with MarketScraper() as scraper:
        return await scraper.scrape()


async def _scrape_corporate():
    async with CorporateScraper() as scraper:
        return await scraper.scrape()


async def _scrape_gis():
    async with GISScraper() as scraper:
        return await scraper.scrape()


def _run_sqlite_ingest() -> dict[str, int]:
    service = DailyDownloadService()
    results = service.run()
    totals: dict[str, int] = {}
    for day in results:
        for table, count in day.rows.items():
            totals[table] = totals.get(table, 0) + count
    return totals


async def run_bootstrap(*, skip_download: bool = False) -> DataManifest:
    """
    Full startup pipeline:
    1. SQLite daily download ingest
    2. Live PSX scrapers → Redis snapshot
    3. Pre-compute aggregates from SQLite + snapshot → Redis
    4. DataManifest → Redis
    """
    store = MarketDataStore.get_instance()
    now = datetime.now(tz=UTC)
    sources: dict[str, DataQualityFlag] = {}

    logger.info("bootstrap.start")

    # 1 — SQLite
    sqlite_rows: dict[str, int] = {}
    if not skip_download:
        try:
            sqlite_rows = await asyncio.to_thread(_run_sqlite_ingest)
            sources["sqlite_daily_ohlcv"] = DataQualityFlag(
                ok=sqlite_rows.get("daily_ohlcv", 0) > 0,
                message="Daily download ingest",
                row_count=sqlite_rows.get("daily_ohlcv", 0),
            )
            sources["sqlite_gis_rates"] = DataQualityFlag(
                ok=sqlite_rows.get("gis_rates", 0) > 0,
                message="GIS revaluation rates",
                row_count=sqlite_rows.get("gis_rates", 0),
            )
        except Exception as exc:
            logger.error("bootstrap.sqlite_failed", error=str(exc))
            sources["sqlite"] = DataQualityFlag(ok=False, message=str(exc))
    else:
        sources["sqlite"] = DataQualityFlag(ok=True, message="skipped")

    # 2 — Live scrapers
    snapshot: MarketSnapshot | None = None
    try:
        snapshot = await _fetch_live_snapshot()
        sources["live_market"] = DataQualityFlag(
            ok=len(snapshot.quotes) > 0,
            message="Market watch quotes",
            row_count=len(snapshot.quotes),
        )
        sources["live_gis"] = DataQualityFlag(
            ok=len(snapshot.gis) > 0,
            message="GIS instruments",
            row_count=len(snapshot.gis),
        )
    except Exception as exc:
        logger.error("bootstrap.live_scrape_failed", error=str(exc))
        sources["live_market"] = DataQualityFlag(ok=False, message=str(exc))
        snapshot = snapshot or MarketSnapshot()

    # News (cached for agent chain; not PSX DPS)
    try:
        async with NewsScraper() as news_scraper:
            articles = await news_scraper.scrape()
        store.set_news_articles(articles)
        sources["news"] = DataQualityFlag(
            ok=len(articles) > 0,
            message="Business news",
            row_count=len(articles),
        )
    except Exception as exc:
        logger.warning("bootstrap.news_failed", error=str(exc))
        sources["news"] = DataQualityFlag(ok=False, message=str(exc))

    # 3 — Pre-compute (SQLite read once)
    aggregates = build_precomputed_aggregates(snapshot)
    snapshot = attach_historical_to_snapshot(snapshot, aggregates)
    store.set_aggregates(aggregates)
    store.set_volatility_map(aggregates.symbol_volatility_90d)
    store.set_market_snapshot(snapshot)

    from app.historical.query import HistoricalDataService

    sqlite_as_of = HistoricalDataService().latest_ohlcv_date()

    manifest = DataManifest(
        last_updated=now,
        trading_day=datetime.now(PKT).date(),
        sqlite_as_of=sqlite_as_of,
        sources=sources,
        risk_free_rate=aggregates.risk_free_rate,
        quote_count=len(snapshot.quotes),
        symbol_ma_count=len(aggregates.moving_averages),
    )
    store.set_manifest(manifest)

    logger.info(
        "bootstrap.complete",
        quotes=manifest.quote_count,
        mas=manifest.symbol_ma_count,
        risk_free=manifest.risk_free_rate,
        sqlite_rows=sqlite_rows,
    )
    return manifest


async def refresh_live_cache() -> None:
    """Background task: refresh live snapshot in Redis (5 min TTL). No SQLite reads."""
    store = MarketDataStore.get_instance()
    try:
        snapshot = await _fetch_live_snapshot()
        aggregates = store.get_aggregates()
        if aggregates:
            snapshot = attach_historical_to_snapshot(snapshot, aggregates)
        store.set_market_snapshot(snapshot)
        logger.info("bootstrap.live_refresh", quotes=len(snapshot.quotes))
    except Exception as exc:
        logger.warning("bootstrap.live_refresh_failed", error=str(exc))
