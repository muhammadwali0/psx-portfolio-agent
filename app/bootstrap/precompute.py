"""Bulk pre-computation from SQLite + live snapshot (bootstrap only)."""

from __future__ import annotations

import math
import statistics
from collections import defaultdict
from datetime import date, datetime
from typing import Any

from app.historical.db import HistoricalDatabase
from app.logger import get_logger
from app.models import (
    FuturesOILeader,
    IndexBreadth,
    MarketSnapshot,
    MoverQuote,
    PrecomputedAggregates,
    SectorPerformance,
    StockQuote,
    SymbolHistoricalContext,
)

logger = get_logger(__name__)


def _sma(closes: list[float], n: int) -> float | None:
    if len(closes) < n:
        return None
    return round(sum(closes[-n:]) / n, 4)


def _annualized_vol(closes: list[float]) -> float | None:
    if len(closes) < 5:
        return None
    returns = []
    for i in range(1, len(closes)):
        if closes[i - 1] > 0:
            returns.append((closes[i] / closes[i - 1]) - 1.0)
    if len(returns) < 3:
        return None
    daily_std = statistics.stdev(returns)
    return round(daily_std * math.sqrt(252) * 100, 2)


def _position_in_range(current: float, bars: list[tuple[float, float]]) -> dict[str, float | None]:
    if not bars or current <= 0:
        return {
            "pct_of_90d_high": None,
            "pct_of_90d_low": None,
            "position_in_90d_range_pct": None,
            "range_90d_high": None,
            "range_90d_low": None,
        }
    hi = max(h for h, _ in bars)
    lo = min(l for _, l in bars)
    span = hi - lo
    return {
        "pct_of_90d_high": round((current / hi) * 100, 2) if hi > 0 else None,
        "pct_of_90d_low": round((current / lo) * 100, 2) if lo > 0 else None,
        "position_in_90d_range_pct": round(((current - lo) / span) * 100, 2) if span > 0 else None,
        "range_90d_high": hi,
        "range_90d_low": lo,
    }


def _load_ohlcv_by_symbol(db: HistoricalDatabase, as_of: date) -> dict[str, list[tuple[str, float, float, float]]]:
    """symbol -> [(date, close, high, low), ...] oldest first, max 200 rows."""
    with db.connect() as conn:
        rows = conn.execute(
            """
            SELECT symbol, date, close, high, low
            FROM daily_ohlcv
            WHERE date <= ?
            ORDER BY symbol, date DESC
            """,
            (as_of.isoformat(),),
        ).fetchall()

    grouped: dict[str, list[tuple[str, float, float, float]]] = defaultdict(list)
    for r in rows:
        sym = r["symbol"].upper()
        if len(grouped[sym]) >= 200:
            continue
        grouped[sym].append(
            (r["date"], float(r["close"]), float(r["high"]), float(r["low"]))
        )

    for sym in grouped:
        grouped[sym].reverse()
    return grouped


def _ytd_pct(closes_by_date: list[tuple[str, float]], year: int) -> float | None:
    if not closes_by_date:
        return None
    year_prefix = f"{year}-"
    year_bars = [(d, c) for d, c in closes_by_date if d.startswith(year_prefix)]
    if not year_bars:
        return None
    start_close = year_bars[0][1]
    end_close = closes_by_date[-1][1]
    if start_close <= 0:
        return None
    return round(((end_close / start_close) - 1.0) * 100, 2)


def _derive_risk_free_rate(snapshot: MarketSnapshot, db: HistoricalDatabase, as_of: date) -> float:
    yields = [g.yield_pct for g in snapshot.gis if g.yield_pct and g.yield_pct > 0]
    if yields:
        return round(sum(yields) / len(yields) / 100, 4)

    with db.connect() as conn:
        row = conn.execute(
            """
            SELECT AVG(revaluation_rate) AS avg_rate
            FROM gis_rates WHERE date = (SELECT MAX(date) FROM gis_rates)
            """
        ).fetchone()
    if row and row["avg_rate"]:
        avg = float(row["avg_rate"])
        # Revaluation prices ~95–108 → map to an implied annual yield band
        implied = max(0.12, min(0.24, (108.0 - avg) / 200.0))
        return round(implied, 4)

    from app.config import get_settings

    return get_settings().risk_free_rate


def _futures_oi_leaders(db: HistoricalDatabase, as_of: date, snapshot: MarketSnapshot) -> list[FuturesOILeader]:
    price_map = {f.symbol.upper(): f.current_price for f in snapshot.futures}
    with db.connect() as conn:
        rows = conn.execute(
            """
            SELECT symbol, open_interest FROM futures_open_interest
            WHERE date = (SELECT MAX(date) FROM futures_open_interest WHERE date <= ?)
            ORDER BY open_interest DESC
            LIMIT 20
            """,
            (as_of.isoformat(),),
        ).fetchall()
    if not rows:
        ranked = sorted(snapshot.futures, key=lambda f: f.volume, reverse=True)[:20]
        return [
            FuturesOILeader(symbol=f.symbol, open_interest=f.volume, latest_price=f.current_price)
            for f in ranked
        ]
    return [
        FuturesOILeader(
            symbol=r["symbol"],
            open_interest=int(r["open_interest"]),
            latest_price=price_map.get(r["symbol"].upper(), 0.0),
        )
        for r in rows
    ]


def _movers_from_quotes(quotes: list[StockQuote], *, by_volume: bool, n: int = 20) -> list[MoverQuote]:
    filtered = [q for q in quotes if q.current_price > 0]
    key_fn = (lambda q: q.volume) if by_volume else (lambda q: abs(q.change_pct))
    ranked = sorted(filtered, key=key_fn, reverse=True)[:n]
    return [
        MoverQuote(
            symbol=q.symbol,
            company_name=q.company_name,
            sector=q.sector,
            current_price=q.current_price,
            change_pct=q.change_pct,
            volume=q.volume,
        )
        for q in ranked
    ]


def build_precomputed_aggregates(
    snapshot: MarketSnapshot,
    db: HistoricalDatabase | None = None,
) -> PrecomputedAggregates:
    from app.historical.query import HistoricalDataService

    database = db or HistoricalDatabase()
    as_of = HistoricalDataService(database).latest_ohlcv_date()

    if as_of is None:
        logger.warning("precompute.no_sqlite_data")
        return PrecomputedAggregates(
            risk_free_rate=_derive_risk_free_rate(snapshot, database, date.today()),
            index_breadth=IndexBreadth(
                advances=snapshot.advances,
                declines=snapshot.declines,
                unchanged=snapshot.unchanged,
                total=snapshot.advances + snapshot.declines + snapshot.unchanged,
            ),
            top_movers_by_volume=_movers_from_quotes(snapshot.quotes, by_volume=True),
            top_movers_by_change_pct=_movers_from_quotes(snapshot.quotes, by_volume=False),
            futures_oi_leaders=_futures_oi_leaders(database, date.today(), snapshot),
        )

    ohlcv = _load_ohlcv_by_symbol(database, as_of)
    quote_map = {q.symbol.upper(): q for q in snapshot.quotes}
    moving_averages: dict[str, SymbolHistoricalContext] = {}
    vol_map: dict[str, float] = {}
    ytd_map: dict[str, float] = {}

    for symbol, bars in ohlcv.items():
        closes = [c for _, c, _, _ in bars]
        ma20 = _sma(closes, 20)
        ma50 = _sma(closes, 50)
        ma200 = _sma(closes, 200)
        vol = _annualized_vol(closes[-90:])
        if vol is not None:
            vol_map[symbol] = vol

        closes_dated = [(d, c) for d, c, _, _ in bars]
        ytd = _ytd_pct(closes_dated, as_of.year)
        if ytd is not None:
            ytd_map[symbol] = ytd

        current = quote_map.get(symbol)
        price = current.current_price if current else (closes[-1] if closes else 0.0)
        hl_bars = [(h, l) for _, _, h, l in bars[-90:]]
        pos = _position_in_range(price, hl_bars)

        moving_averages[symbol] = SymbolHistoricalContext(
            symbol=symbol,
            ma20=ma20,
            ma50=ma50,
            ma200=ma200,
            pct_of_90d_high=pos["pct_of_90d_high"],
            pct_of_90d_low=pos["pct_of_90d_low"],
            position_in_90d_range_pct=pos["position_in_90d_range_pct"],
            range_90d_high=pos["range_90d_high"],
            range_90d_low=pos["range_90d_low"],
        )

    sector_closes: dict[str, list[float]] = defaultdict(list)
    for symbol, bars in ohlcv.items():
        q = quote_map.get(symbol)
        sector = (q.sector if q and q.sector else "Unknown").strip() or "Unknown"
        closes_only = [(d, c) for d, c, _, _ in bars]
        ytd = _ytd_pct(closes_only, as_of.year)
        if ytd is not None:
            sector_closes[sector].append(ytd)

    sector_performance = [
        SectorPerformance(
            sector=sector,
            symbol_count=len(vals),
            avg_ytd_pct=round(sum(vals) / len(vals), 2),
        )
        for sector, vals in sorted(sector_closes.items(), key=lambda x: -len(x[1]))
    ]

    risk_free = _derive_risk_free_rate(snapshot, database, as_of)
    gis_avg = None
    if snapshot.gis:
        rates = [g.yield_pct for g in snapshot.gis if g.yield_pct > 0]
        gis_avg = round(sum(rates) / len(rates), 2) if rates else None

    return PrecomputedAggregates(
        as_of_date=as_of,
        risk_free_rate=risk_free,
        moving_averages=moving_averages,
        sector_performance=sector_performance,
        index_breadth=IndexBreadth(
            advances=snapshot.advances,
            declines=snapshot.declines,
            unchanged=snapshot.unchanged,
            total=snapshot.advances + snapshot.declines + snapshot.unchanged,
        ),
        top_movers_by_volume=_movers_from_quotes(snapshot.quotes, by_volume=True),
        top_movers_by_change_pct=_movers_from_quotes(snapshot.quotes, by_volume=False),
        futures_oi_leaders=_futures_oi_leaders(database, as_of, snapshot),
        symbol_volatility_90d=vol_map,
        symbol_ytd_pct=ytd_map,
        gis_benchmark_rate=gis_avg,
    )


def attach_historical_to_snapshot(
    snapshot: MarketSnapshot,
    aggregates: PrecomputedAggregates,
) -> MarketSnapshot:
    """Embed MA context on snapshot for signal extraction (no SQLite at request time)."""
    from app.models import HistoricalContext

    by_symbol = {
        sym: aggregates.moving_averages[sym]
        for sym in (q.symbol.upper() for q in snapshot.quotes)
        if sym in aggregates.moving_averages
    }
    snapshot.historical = HistoricalContext(
        as_of_date=aggregates.as_of_date,
        by_symbol=by_symbol,
    )
    return snapshot
