"""Attach historical analytics to live market snapshots."""

from __future__ import annotations

from app.historical.query import HistoricalDataService
from app.logger import get_logger
from app.models import MarketSnapshot

logger = get_logger(__name__)


def enrich_snapshot_with_history(
    snapshot: MarketSnapshot,
    *,
    service: HistoricalDataService | None = None,
) -> MarketSnapshot:
    """
    Populate ``snapshot.historical`` from SQLite when data is available.
    No-op if the database is empty or unreadable.
    """
    svc = service or HistoricalDataService()
    if svc.latest_ohlcv_date() is None:
        return snapshot

    symbols = [q.symbol for q in snapshot.quotes if q.symbol]
    prices = {q.symbol.upper(): q.current_price for q in snapshot.quotes if q.current_price > 0}
    gis_symbols = {g.symbol.upper() for g in snapshot.gis if g.symbol}

    # Futures contracts often use month suffixes; map underlying from quotes when possible.
    futures_by_base: dict[str, str] = {}
    for f in snapshot.futures:
        base = f.symbol.split("-")[0].upper()
        futures_by_base.setdefault(base, f.symbol.upper())

    try:
        ctx = svc.build_context_for_symbols(
            symbols,
            prices,
            gis_symbols=gis_symbols,
        )
        for sym, hist in ctx.by_symbol.items():
            fut_sym = futures_by_base.get(sym)
            if fut_sym and fut_sym != sym:
                trend = svc.futures_open_interest_trend(fut_sym)
                if trend:
                    hist.futures_oi_trend = trend
        snapshot.historical = ctx
        logger.info(
            "historical.enriched",
            symbols=len(ctx.by_symbol),
            as_of=str(ctx.as_of_date),
        )
    except Exception as exc:
        logger.warning("historical.enrich_failed", error=str(exc))
    return snapshot
