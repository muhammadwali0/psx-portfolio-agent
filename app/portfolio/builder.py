"""
Portfolio Builder
=================
Converts Gemini agent JSON output into a fully-typed Portfolio with PKR
amounts, share counts, stop-losses, and a simplified Sharpe estimate.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.config import get_settings
from app.logger import get_logger
from app.models import (
    ConflictReport,
    Portfolio,
    PortfolioPosition,
    RiskLevel,
    Signal,
    StockQuote,
)

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
    ) -> Portfolio:
        quote_map = {q.symbol: q for q in quotes}
        signal_map: dict[str, list[Signal]] = {}
        for sig in all_signals:
            signal_map.setdefault(sig.ticker, []).append(sig)

        raw_positions = self._clamp_allocations(
            gemini_output.get("positions", []),
            float(gemini_output.get("cash_allocation_pct", 10.0)),
        )

        positions = [
            p for raw in raw_positions
            if (p := self._build_position(raw, capital_pkr, quote_map, signal_map))
        ]

        expected_return = float(gemini_output.get("expected_portfolio_return_pct", 0.0))
        cash_pct = float(gemini_output.get("cash_allocation_pct", 10.0))

        portfolio = Portfolio(
            id=str(uuid.uuid4()),
            total_capital_pkr=capital_pkr,
            positions=positions,
            cash_pct=cash_pct,
            expected_return_pct=expected_return,
            sharpe_ratio=self._sharpe(positions, expected_return),
            overall_risk=_risk_from_str(gemini_output.get("risk_assessment", "medium")),
            construction_rationale=gemini_output.get("reasoning_summary", ""),
            conflicts_resolved=conflicts,
            constructed_at=datetime.now(tz=timezone.utc),
        )

        logger.info(
            "portfolio_builder.done",
            id=portfolio.id,
            positions=len(positions),
            invested_pct=portfolio.invested_pct,
        )
        return portfolio

    # ── Private helpers ────────────────────────────────────────────────────────

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
    ) -> PortfolioPosition | None:
        ticker = str(data.get("ticker", "")).upper().strip()
        alloc_pct = float(data.get("allocation_pct", 0))
        if not ticker or alloc_pct <= 0:
            return None

        pos_capital = capital_pkr * (alloc_pct / 100)
        quote = quote_map.get(ticker)
        price = quote.current_price if quote and quote.current_price > 0 else 0.0
        shares = int(pos_capital / price) if price > 0 else 0

        stop_loss_pct = float(data.get("stop_loss_pct", 7.0))
        target_pct = float(data.get("target_return_pct", 15.0))

        return PortfolioPosition(
            ticker=ticker,
            company_name=quote.company_name if quote else "",
            sector=quote.sector if quote else "",
            allocation_pct=alloc_pct,
            capital_pkr=round(pos_capital, 2),
            shares=shares,
            entry_price=price,
            stop_loss=round(price * (1 - stop_loss_pct / 100), 2) if price > 0 else None,
            target_price=round(price * (1 + target_pct / 100), 2) if price > 0 else None,
            risk_level=_risk_from_str(data.get("risk_level", "medium")),
            supporting_signals=signal_map.get(ticker, [])[:5],
            justification=data.get("entry_rationale", ""),
        )

    def _sharpe(self, positions: list[PortfolioPosition], expected_return: float) -> float | None:
        if not positions:
            return None
        risk_map = {RiskLevel.LOW: 8.0, RiskLevel.MEDIUM: 15.0, RiskLevel.HIGH: 25.0}
        total = sum(p.allocation_pct for p in positions) or 1
        weighted_std = sum(p.allocation_pct / total * risk_map[p.risk_level] for p in positions)
        excess = expected_return - self._cfg.risk_free_rate * 100
        return round(excess / weighted_std, 3) if weighted_std > 0 else None
