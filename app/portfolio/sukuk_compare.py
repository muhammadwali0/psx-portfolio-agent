"""
Sukuk (GIS) vs equity comparison using cached GIS benchmark and equity returns.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.data.store import MarketDataStore
from app.logger import get_logger

logger = get_logger(__name__)


class SukukEquityComparison(BaseModel):
    equity_symbol: str
    equity_price: float
    equity_ytd_pct: float | None = None
    gis_benchmark_yield_pct: float = Field(description="Risk-free / GIS benchmark %")
    gis_benchmark_rate_decimal: float
    excess_return_vs_gis_pct: float | None = None
    recommendation: str = ""


class SukukCompareService:
    """Compare equity return potential vs GIS sukuk benchmark from Redis aggregates."""

    def compare(self, equity_symbol: str) -> SukukEquityComparison:
        store = MarketDataStore.get_instance()
        store.require_ready()
        snap = store.get_market_snapshot()
        agg = store.get_aggregates()
        rf = store.get_risk_free_rate()

        sym = equity_symbol.upper()
        quote = next((q for q in (snap.quotes if snap else []) if q.symbol.upper() == sym), None)
        price = quote.current_price if quote else 0.0

        ytd = agg.symbol_ytd_pct.get(sym) if agg else None

        gis_yield = (agg.gis_benchmark_rate if agg and agg.gis_benchmark_rate else rf * 100)

        excess = round(ytd - gis_yield, 2) if ytd is not None else None
        if excess is None:
            rec = "Insufficient YTD data; compare manually against GIS yield."
        elif excess > 5:
            rec = f"Equity sector YTD exceeds GIS benchmark by {excess:.1f}pp — higher risk/return."
        elif excess < 0:
            rec = f"GIS benchmark ({gis_yield:.1f}%) exceeds equity YTD — sukuk may offer better risk-adjusted carry."
        else:
            rec = "Equity and GIS returns are broadly aligned; consider risk tolerance."

        return SukukEquityComparison(
            equity_symbol=sym,
            equity_price=price,
            equity_ytd_pct=ytd,
            gis_benchmark_yield_pct=round(gis_yield, 2),
            gis_benchmark_rate_decimal=rf,
            excess_return_vs_gis_pct=excess,
            recommendation=rec,
        )
