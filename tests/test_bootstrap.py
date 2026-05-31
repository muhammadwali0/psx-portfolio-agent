"""Tests for bootstrap pre-compute (no live PSX)."""

from __future__ import annotations

from datetime import date

import pytest

from app.bootstrap.precompute import build_precomputed_aggregates
from app.data.store import MarketDataStore
from app.historical.db import HistoricalDatabase
from app.models import MarketSnapshot, StockQuote


@pytest.fixture
def seeded_store(tmp_path):
    db_path = tmp_path / "hist.db"
    db = HistoricalDatabase(db_path)
    db.initialize()
    trade = date(2025, 5, 23)
    for i in range(30):
        d = date(2025, 4, 1 + i)
        db.insert_ohlcv(
            [
                {
                    "symbol": "ABL",
                    "date": d.isoformat(),
                    "open": 100 + i,
                    "high": 101 + i,
                    "low": 99 + i,
                    "close": 100 + i,
                    "volume": 1000,
                    "value": 100000.0,
                }
            ]
        )
    snap = MarketSnapshot(
        quotes=[StockQuote(symbol="ABL", current_price=128.0, volume=50000, sector="Banking")],
        advances=100,
        declines=80,
        unchanged=20,
    )
    agg = build_precomputed_aggregates(snap, db)
    store = MarketDataStore()
    MarketDataStore._instance = store
    store.set_aggregates(agg)
    store.set_volatility_map(agg.symbol_volatility_90d)
    store.set_market_snapshot(snap)
    yield store
    MarketDataStore.reset_instance()


def test_precompute_ma_and_vol(seeded_store):
    agg = seeded_store.get_aggregates()
    assert agg is not None
    assert "ABL" in agg.moving_averages
    assert agg.moving_averages["ABL"].ma20 is not None
    assert "ABL" in agg.symbol_volatility_90d


def test_scenario_from_store(seeded_store):
    from app.portfolio.scenario import ScenarioSimulator

    report = ScenarioSimulator().run(["ABL"], {"ABL": 1.0})
    assert len(report.scenarios) == 1
    assert report.scenarios[0].volatility_90d_pct > 0
