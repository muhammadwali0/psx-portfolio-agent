"""Query layer over ingested PSX historical SQLite data."""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.historical.db import HistoricalDatabase
from app.logger import get_logger
from app.models import (
    FuturesOITrendPoint,
    GISRatePoint,
    HistoricalContext,
    IndexConstituentChange,
    OHLCVBar,
    SymbolHistoricalContext,
)

logger = get_logger(__name__)
PKT = ZoneInfo("Asia/Karachi")


class HistoricalDataService:
    """Analytics over ``HistoricalDatabase`` for portfolio and snapshot enrichment."""

    def __init__(self, db: HistoricalDatabase | None = None) -> None:
        self.db = db or HistoricalDatabase()
        self.db.initialize()

    def latest_ohlcv_date(self) -> date | None:
        with self.db.connect() as conn:
            row = conn.execute("SELECT MAX(date) AS d FROM daily_ohlcv").fetchone()
        if not row or not row["d"]:
            return None
        return date.fromisoformat(row["d"])

    def moving_averages(
        self, symbol: str, *, as_of: date | None = None
    ) -> dict[str, float | None]:
        symbol = symbol.upper()
        end = as_of or self.latest_ohlcv_date()
        if not end:
            return {"ma20": None, "ma50": None, "ma200": None}

        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT close FROM daily_ohlcv
                WHERE symbol = ? AND date <= ?
                ORDER BY date DESC
                LIMIT 200
                """,
                (symbol, end.isoformat()),
            ).fetchall()

        closes = [float(r["close"]) for r in rows]
        closes.reverse()

        def _sma(n: int) -> float | None:
            if len(closes) < n:
                return None
            window = closes[-n:]
            return round(sum(window) / len(window), 4)

        return {"ma20": _sma(20), "ma50": _sma(50), "ma200": _sma(200)}

    def ohlcv_90d(self, symbol: str, *, as_of: date | None = None) -> list[OHLCVBar]:
        symbol = symbol.upper()
        end = as_of or self.latest_ohlcv_date()
        if not end:
            return []

        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT date, open, high, low, close, volume, value
                FROM daily_ohlcv
                WHERE symbol = ? AND date <= ?
                ORDER BY date DESC
                LIMIT 90
                """,
                (symbol, end.isoformat()),
            ).fetchall()

        bars = [
            OHLCVBar(
                date=date.fromisoformat(r["date"]),
                open=float(r["open"]),
                high=float(r["high"]),
                low=float(r["low"]),
                close=float(r["close"]),
                volume=int(r["volume"]),
                value=float(r["value"]),
            )
            for r in reversed(rows)
        ]
        return bars

    def price_position_vs_90d(
        self, symbol: str, current_price: float, *, as_of: date | None = None
    ) -> dict[str, float | None]:
        bars = self.ohlcv_90d(symbol, as_of=as_of)
        if not bars or current_price <= 0:
            return {
                "pct_of_90d_high": None,
                "pct_of_90d_low": None,
                "position_in_90d_range_pct": None,
                "range_90d_high": None,
                "range_90d_low": None,
            }

        hi = max(b.high for b in bars)
        lo = min(b.low for b in bars)
        span = hi - lo
        pct_high = round((current_price / hi) * 100, 2) if hi > 0 else None
        pct_low = round((current_price / lo) * 100, 2) if lo > 0 else None
        position = round(((current_price - lo) / span) * 100, 2) if span > 0 else None
        return {
            "pct_of_90d_high": pct_high,
            "pct_of_90d_low": pct_low,
            "position_in_90d_range_pct": position,
            "range_90d_high": hi,
            "range_90d_low": lo,
        }

    def gis_rate_history(
        self, symbol: str, *, days: int = 90, as_of: date | None = None
    ) -> list[GISRatePoint]:
        symbol = symbol.upper()
        end = (as_of or self.latest_ohlcv_date() or datetime.now(PKT).date()).isoformat()
        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT date, revaluation_rate FROM gis_rates
                WHERE symbol = ? AND date <= ?
                ORDER BY date DESC
                LIMIT ?
                """,
                (symbol, end, days),
            ).fetchall()
        return [
            GISRatePoint(
                date=date.fromisoformat(r["date"]),
                revaluation_rate=float(r["revaluation_rate"]),
            )
            for r in reversed(rows)
        ]

    def index_constituent_changes(
        self,
        index_name: str = "KSE-100",
        *,
        days: int = 90,
        as_of: date | None = None,
    ) -> list[IndexConstituentChange]:
        end = as_of or self.latest_ohlcv_date()
        if not end:
            return []

        with self.db.connect() as conn:
            dates = [
                date.fromisoformat(r["d"])
                for r in conn.execute(
                    """
                    SELECT DISTINCT date AS d FROM index_constituents
                    WHERE index_name = ? AND date <= ?
                    ORDER BY date DESC
                    LIMIT 2
                    """,
                    (index_name, end.isoformat()),
                ).fetchall()
            ]
            if len(dates) < 2:
                return []
            newer, older = dates[0], dates[1]

            def _map(d: date) -> dict[str, float]:
                return {
                    r["symbol"]: float(r["weight"])
                    for r in conn.execute(
                        """
                        SELECT symbol, weight FROM index_constituents
                        WHERE index_name = ? AND date = ?
                        """,
                        (index_name, d.isoformat()),
                    ).fetchall()
                }

            new_map, old_map = _map(newer), _map(older)

        changes: list[IndexConstituentChange] = []
        for sym, wt in new_map.items():
            if sym not in old_map:
                changes.append(
                    IndexConstituentChange(
                        index_name=index_name,
                        symbol=sym,
                        change_type="added",
                        new_weight=wt,
                        effective_date=newer,
                    )
                )
            elif abs(wt - old_map[sym]) >= 0.01:
                changes.append(
                    IndexConstituentChange(
                        index_name=index_name,
                        symbol=sym,
                        change_type="weight_change",
                        old_weight=old_map[sym],
                        new_weight=wt,
                        effective_date=newer,
                    )
                )
        for sym, wt in old_map.items():
            if sym not in new_map:
                changes.append(
                    IndexConstituentChange(
                        index_name=index_name,
                        symbol=sym,
                        change_type="removed",
                        old_weight=wt,
                        effective_date=newer,
                    )
                )
        return changes[:50]

    def futures_open_interest_trend(
        self, symbol: str, *, days: int = 30, as_of: date | None = None
    ) -> list[FuturesOITrendPoint]:
        symbol = symbol.upper()
        end = (as_of or self.latest_ohlcv_date() or datetime.now(PKT).date()).isoformat()
        with self.db.connect() as conn:
            rows = conn.execute(
                """
                SELECT date, open_interest FROM futures_open_interest
                WHERE symbol = ? AND date <= ?
                ORDER BY date DESC
                LIMIT ?
                """,
                (symbol, end, days),
            ).fetchall()
        return [
            FuturesOITrendPoint(
                date=date.fromisoformat(r["date"]),
                open_interest=int(r["open_interest"]),
            )
            for r in reversed(rows)
        ]

    def build_symbol_context(
        self,
        symbol: str,
        current_price: float,
        *,
        as_of: date | None = None,
        include_gis: bool = False,
        futures_symbol: str | None = None,
    ) -> SymbolHistoricalContext:
        mas = self.moving_averages(symbol, as_of=as_of)
        position = self.price_position_vs_90d(symbol, current_price, as_of=as_of)
        return SymbolHistoricalContext(
            symbol=symbol.upper(),
            ma20=mas["ma20"],
            ma50=mas["ma50"],
            ma200=mas["ma200"],
            ohlcv_90d=self.ohlcv_90d(symbol, as_of=as_of),
            pct_of_90d_high=position["pct_of_90d_high"],
            pct_of_90d_low=position["pct_of_90d_low"],
            position_in_90d_range_pct=position["position_in_90d_range_pct"],
            range_90d_high=position["range_90d_high"],
            range_90d_low=position["range_90d_low"],
            gis_rates=self.gis_rate_history(symbol, days=90, as_of=as_of) if include_gis else [],
            futures_oi_trend=self.futures_open_interest_trend(
                futures_symbol or symbol, days=30, as_of=as_of
            ),
        )

    def build_context_for_symbols(
        self,
        symbols: list[str],
        prices: dict[str, float],
        *,
        gis_symbols: set[str] | None = None,
        index_name: str = "KSE-100",
    ) -> HistoricalContext:
        as_of = self.latest_ohlcv_date()
        gis_set = {s.upper() for s in (gis_symbols or set())}
        by_symbol: dict[str, SymbolHistoricalContext] = {}

        for sym in symbols:
            sym_u = sym.upper()
            price = prices.get(sym_u, 0.0)
            if price <= 0:
                continue
            by_symbol[sym_u] = self.build_symbol_context(
                sym_u,
                price,
                as_of=as_of,
                include_gis=sym_u in gis_set,
            )

        return HistoricalContext(
            as_of_date=as_of,
            by_symbol=by_symbol,
            index_constituent_changes=self.index_constituent_changes(index_name, as_of=as_of),
        )
