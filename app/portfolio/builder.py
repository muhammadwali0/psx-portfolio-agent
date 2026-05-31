"""
Portfolio Builder
=================
Converts Gemini agent JSON output into a fully-typed Portfolio with PKR
amounts, share counts, and Sharpe ratio from pre-computed SQLite volatility.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from app.config import get_settings
from app.logger import get_logger
from app.models import (
    ConflictReport,
    GISMetrics,
    InvestmentMode,
    MarketSnapshot,
    Portfolio,
    PortfolioPosition,
    PrecomputedAggregates,
    RiskLevel,
    Signal,
    StockQuote,
)
from app.services.shariah import ShariahFilter

logger = get_logger(__name__)


def _risk_from_str(val: str) -> RiskLevel:
    return {"low": RiskLevel.LOW, "medium": RiskLevel.MEDIUM, "high": RiskLevel.HIGH}.get(
        val.lower(), RiskLevel.MEDIUM
    )


class PortfolioBuilder:
    """Build a Portfolio from structured Gemini output."""

    def __init__(self) -> None:
        self._cfg = get_settings()

    def build(
        self,
        gemini_output: dict[str, Any],
        capital_pkr: float,
        quotes: list[StockQuote],
        all_signals: list[Signal],
        conflicts: list[ConflictReport],
        investment_mode: InvestmentMode = InvestmentMode.FUNDAMENTAL,
        aggregates: PrecomputedAggregates | None = None,
        risk_free_rate: float | None = None,
        shariah_mode: bool = False,
        snapshot: MarketSnapshot | None = None,
    ) -> Portfolio:
        quote_map = {q.symbol: q for q in quotes}
        gis_map: dict[str, GISMetrics] = {}
        shariah: ShariahFilter | None = None
        if shariah_mode and snapshot:
            shariah = ShariahFilter()
            gis_map = {g.symbol.upper(): g for g in snapshot.gis}

        signal_map: dict[str, list[Signal]] = {}
        for sig in all_signals:
            signal_map.setdefault(sig.ticker, []).append(sig)

        vol_map = aggregates.symbol_volatility_90d if aggregates else {}
        rf = risk_free_rate if risk_free_rate is not None else self._cfg.risk_free_rate
        if shariah_mode and aggregates and aggregates.gis_benchmark_rate:
            rf = round(aggregates.gis_benchmark_rate / 100, 4)

        raw_positions = self._clamp_allocations(
            gemini_output.get("positions", []),
            float(gemini_output.get("cash_allocation_pct", 10.0)),
        )

        positions = []
        for raw in raw_positions:
            pos = self._build_position(
                raw,
                capital_pkr,
                quote_map,
                signal_map,
                investment_mode,
                shariah_mode=shariah_mode,
                shariah=shariah,
                gis_map=gis_map,
            )
            if pos:
                positions.append(pos)

        expected_return = float(gemini_output.get("expected_portfolio_return_pct", 0.0))
        cash_pct = float(gemini_output.get("cash_allocation_pct", 10.0))

        portfolio = Portfolio(
            id=str(uuid.uuid4()),
            investment_mode=investment_mode,
            shariah_compliant=shariah_mode,
            total_capital_pkr=capital_pkr,
            positions=positions,
            cash_pct=cash_pct,
            expected_return_pct=expected_return,
            sharpe_ratio=self._sharpe(positions, expected_return, vol_map, rf),
            overall_risk=_risk_from_str(gemini_output.get("risk_assessment", "medium")),
            construction_rationale=gemini_output.get("reasoning_summary", ""),
            conflicts_resolved=conflicts,
            constructed_at=datetime.now(tz=UTC),
        )

        logger.info(
            "portfolio_builder.done",
            id=portfolio.id,
            positions=len(positions),
            invested_pct=portfolio.invested_pct,
            risk_free=rf,
        )
        return portfolio

    def _clamp_allocations(
        self, positions: list[dict[str, Any]], cash_pct: float
    ) -> list[dict[str, Any]]:
        max_pct = self._cfg.portfolio_max_single_stock_pct * 100
        min_pct = self._cfg.portfolio_min_single_stock_pct * 100
        for p in positions:
            p["allocation_pct"] = max(min_pct, min(max_pct, float(p.get("allocation_pct", 0))))
        invested = sum(float(p.get("allocation_pct", 0)) for p in positions)
        if invested + cash_pct > 100 and invested > 0:
            scale = (100 - cash_pct) / invested
            for p in positions:
                p["allocation_pct"] = round(p["allocation_pct"] * scale, 2)
        return positions

    def _build_position(
        self,
        data: dict[str, Any],
        capital_pkr: float,
        quote_map: dict[str, StockQuote],
        signal_map: dict[str, list[Signal]],
        investment_mode: InvestmentMode,
        *,
        shariah_mode: bool = False,
        shariah: ShariahFilter | None = None,
        gis_map: dict[str, GISMetrics] | None = None,
    ) -> PortfolioPosition | None:
        ticker = str(data.get("ticker", "")).upper().strip()
        alloc_pct = float(data.get("allocation_pct", 0))
        if not ticker or alloc_pct <= 0:
            return None

        instrument_type = str(data.get("instrument_type", "equity") or "equity").lower()
        gis = (gis_map or {}).get(ticker)
        is_sukuk = instrument_type == "gis_sukuk" or (gis is not None and ticker.startswith("P"))

        if shariah_mode and shariah:
            if is_sukuk:
                if not gis:
                    logger.debug("portfolio_builder.shariah_skip_sukuk", ticker=ticker)
                    return None
            elif not shariah.is_compliant_equity(ticker):
                logger.debug("portfolio_builder.shariah_skip_equity", ticker=ticker)
                return None

        pos_capital = capital_pkr * (alloc_pct / 100)
        quote = quote_map.get(ticker)
        if is_sukuk and gis:
            price = gis.current_price if gis.current_price > 0 else 0.0
            company = gis.name or gis.symbol
            sector = gis.sector
        else:
            price = quote.current_price if quote and quote.current_price > 0 else 0.0
            company = quote.company_name if quote else ""
            sector = quote.sector if quote else ""
        shares = int(pos_capital / price) if price > 0 else 0

        target_pct = float(data.get("target_return_pct", 15.0))
        stop_loss = None
        target_price = None
        if investment_mode == InvestmentMode.TACTICAL:
            stop_loss_pct = float(data.get("stop_loss_pct", 7.0))
            if price > 0:
                stop_loss = round(price * (1 - stop_loss_pct / 100), 2)
                target_price = round(price * (1 + target_pct / 100), 2)

        return PortfolioPosition(
            ticker=ticker,
            company_name=company,
            sector=sector,
            allocation_pct=alloc_pct,
            capital_pkr=round(pos_capital, 2),
            shares=shares,
            entry_price=price,
            stop_loss=stop_loss,
            target_price=target_price,
            hold_duration_days=self._optional_int(data.get("hold_duration_days")),
            thesis_invalidation_conditions=self._string_list(
                data.get("thesis_invalidation_conditions")
            ),
            sector_outlook=str(data.get("sector_outlook", "") or ""),
            range_52w_position=str(data.get("range_52w_position", "") or ""),
            ytd_trend=str(data.get("ytd_trend", "") or ""),
            rebalancing_triggers=self._string_list(data.get("rebalancing_triggers")),
            risk_level=_risk_from_str(data.get("risk_level", "medium")),
            supporting_signals=signal_map.get(ticker, [])[:5],
            justification=data.get("entry_rationale", ""),
            instrument_type="gis_sukuk" if is_sukuk else "equity",
            shariah_compliant=bool(data.get("shariah_compliant", shariah_mode)),
        )

    def _optional_int(self, value: Any) -> int | None:
        try:
            return int(value) if value not in (None, "") else None
        except (TypeError, ValueError):
            return None

    def _string_list(self, value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item) for item in value if str(item).strip()]
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    def _sharpe(
        self,
        positions: list[PortfolioPosition],
        expected_return: float,
        vol_map: dict[str, float],
        risk_free_rate: float,
    ) -> float | None:
        if not positions:
            return None
        total = sum(p.allocation_pct for p in positions) or 1
        weighted_vol = 0.0
        for p in positions:
            vol = vol_map.get(p.ticker.upper())
            if vol is None or vol <= 0:
                risk_map = {RiskLevel.LOW: 8.0, RiskLevel.MEDIUM: 15.0, RiskLevel.HIGH: 25.0}
                vol = risk_map[p.risk_level]
            weighted_vol += (p.allocation_pct / total) * vol
        excess = expected_return - risk_free_rate * 100
        return round(excess / weighted_vol, 3) if weighted_vol > 0 else None
