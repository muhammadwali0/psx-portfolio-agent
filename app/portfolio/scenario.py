"""
Scenario simulator — stress tests using pre-computed 90-day volatility per symbol.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.data.store import MarketDataStore
from app.logger import get_logger

logger = get_logger(__name__)


class ScenarioResult(BaseModel):
    symbol: str
    current_price: float
    volatility_90d_pct: float
    mild_shock_pct: float = Field(description="−1σ move")
    severe_shock_pct: float = Field(description="−2σ move")
    mild_price: float
    severe_price: float


class PortfolioScenarioReport(BaseModel):
    risk_free_rate: float
    scenarios: list[ScenarioResult] = []
    portfolio_mild_drawdown_pct: float | None = None
    portfolio_severe_drawdown_pct: float | None = None


class ScenarioSimulator:
    """Run volatility-based stress scenarios from Redis (no SQLite at request time)."""

    def run(
        self,
        symbols: list[str],
        weights: dict[str, float] | None = None,
    ) -> PortfolioScenarioReport:
        store = MarketDataStore.get_instance()
        store.require_ready()
        snap = store.get_market_snapshot()
        vol_map = store.get_volatility_map()
        rf = store.get_risk_free_rate()

        quote_map = {q.symbol.upper(): q for q in (snap.quotes if snap else [])}
        weights = weights or {s.upper(): 1.0 / len(symbols) for s in symbols}

        scenarios: list[ScenarioResult] = []
        mild_portfolio = 0.0
        severe_portfolio = 0.0

        for sym in symbols:
            sym_u = sym.upper()
            q = quote_map.get(sym_u)
            price = q.current_price if q else 0.0
            vol = vol_map.get(sym_u, 15.0)
            mild = -vol
            severe = -2 * vol
            w = weights.get(sym_u, 0.0)
            mild_portfolio += w * mild
            severe_portfolio += w * severe
            if price > 0:
                scenarios.append(
                    ScenarioResult(
                        symbol=sym_u,
                        current_price=price,
                        volatility_90d_pct=vol,
                        mild_shock_pct=round(mild, 2),
                        severe_shock_pct=round(severe, 2),
                        mild_price=round(price * (1 + mild / 100), 2),
                        severe_price=round(price * (1 + severe / 100), 2),
                    )
                )

        return PortfolioScenarioReport(
            risk_free_rate=rf,
            scenarios=scenarios,
            portfolio_mild_drawdown_pct=round(mild_portfolio, 2) if scenarios else None,
            portfolio_severe_drawdown_pct=round(severe_portfolio, 2) if scenarios else None,
        )
