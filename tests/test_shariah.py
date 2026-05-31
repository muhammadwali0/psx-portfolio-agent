"""Tests for Shariah-compliant filtering and portfolio construction."""

from __future__ import annotations

from datetime import date

import pytest

from app.historical.db import HistoricalDatabase
from app.models import (
    GISMetrics,
    InvestmentMode,
    MarketSnapshot,
    StockQuote,
)
from app.portfolio.builder import PortfolioBuilder
from app.services.shariah import FALLBACK_KMI30_SYMBOLS, ShariahFilter


@pytest.fixture
def shariah_db(tmp_path):
    db = HistoricalDatabase(tmp_path / "shariah.db")
    db.initialize()
    trade = "2025-05-23"
    for sym in ("ABL", "HBL", "ENGRO"):
        db.insert_index_constituents(
            [
                {
                    "index_name": "KMI-30",
                    "symbol": sym,
                    "weight": 3.3,
                    "date": trade,
                }
            ]
        )
    return db


def test_shariah_filter_returns_kmi30_from_sqlite(shariah_db):
    filt = ShariahFilter(shariah_db)
    universe = filt.get_universe()
    assert "ABL" in universe
    assert "HBL" in universe
    assert "ENGRO" in universe
    assert "NOTKMI" not in universe


def test_shariah_filter_fallback_when_sqlite_empty(tmp_path):
    db = HistoricalDatabase(tmp_path / "empty.db")
    db.initialize()
    filt = ShariahFilter(db)
    universe = filt.get_universe()
    assert universe == FALLBACK_KMI30_SYMBOLS


def test_shariah_excludes_futures_and_bonds():
    filt = ShariahFilter()
    assert filt.is_excluded_instrument("ENGRO-JUN")
    assert filt.is_excluded_instrument("P01GIS230525")
    assert not filt.is_excluded_instrument("ENGRO")


def test_portfolio_builder_filters_non_compliant_equities(shariah_db, monkeypatch):
    filt = ShariahFilter(shariah_db)
    monkeypatch.setattr(
        "app.portfolio.builder.ShariahFilter",
        lambda *args, **kwargs: filt,
    )
    builder = PortfolioBuilder()
    snapshot = MarketSnapshot(
        quotes=[
            StockQuote(symbol="ABL", current_price=100.0, volume=1000),
            StockQuote(symbol="FAKECO", current_price=50.0, volume=1000),
        ],
        gis=[
            GISMetrics(symbol="P01GIS230525", current_price=99.0, yield_pct=12.5),
        ],
    )
    gemini_output = {
        "reasoning_summary": "Shariah test",
        "risk_assessment": "medium",
        "positions": [
            {
                "ticker": "ABL",
                "allocation_pct": 50.0,
                "entry_rationale": "Compliant",
                "instrument_type": "equity",
                "shariah_compliant": True,
                "risk_level": "medium",
            },
            {
                "ticker": "FAKECO",
                "allocation_pct": 30.0,
                "entry_rationale": "Non-compliant",
                "risk_level": "medium",
            },
            {
                "ticker": "P01GIS230525",
                "allocation_pct": 20.0,
                "entry_rationale": "Sukuk sleeve",
                "instrument_type": "gis_sukuk",
                "shariah_compliant": True,
                "risk_level": "low",
            },
        ],
        "cash_allocation_pct": 0.0,
        "expected_portfolio_return_pct": 12.0,
    }

    portfolio = builder.build(
        gemini_output,
        1_000_000,
        snapshot.quotes,
        [],
        [],
        investment_mode=InvestmentMode.FUNDAMENTAL,
        shariah_mode=True,
        snapshot=snapshot,
        risk_free_rate=0.125,
    )

    assert portfolio.shariah_compliant is True
    tickers = {p.ticker for p in portfolio.positions}
    assert "ABL" in tickers
    assert "FAKECO" not in tickers
    assert "P01GIS230525" in tickers
    sukuk = next(p for p in portfolio.positions if p.ticker == "P01GIS230525")
    assert sukuk.instrument_type == "gis_sukuk"
    assert sukuk.shariah_compliant is True
    assert all(p.shariah_compliant for p in portfolio.positions)


def test_shariah_filter_equity_only_kmi30():
    filt = ShariahFilter()
    universe = filt.get_universe()
    compliant = filt.filter_equity_symbols(["ABL", "ENGRO-JUN", "RANDOM"])
    for sym in compliant:
        assert sym in universe
    assert "ENGRO-JUN" not in compliant
    assert "RANDOM" not in compliant


def test_shariah_builder_rejects_bond_allocates_sukuk(shariah_db, monkeypatch):
    """Conventional bond-like tickers are dropped; GIS Sukuk sleeve is kept."""
    filt = ShariahFilter(shariah_db)
    monkeypatch.setattr(
        "app.portfolio.builder.ShariahFilter",
        lambda *args, **kwargs: filt,
    )
    builder = PortfolioBuilder()
    snapshot = MarketSnapshot(
        quotes=[StockQuote(symbol="ABL", current_price=100.0, volume=1000)],
        gis=[GISMetrics(symbol="P01GIS230525", current_price=99.0, yield_pct=12.5)],
    )
    gemini_output = {
        "reasoning_summary": "Shariah fixed income",
        "risk_assessment": "medium",
        "positions": [
            {
                "ticker": "ABL",
                "allocation_pct": 60.0,
                "entry_rationale": "Equity",
                "instrument_type": "equity",
                "shariah_compliant": True,
                "risk_level": "medium",
            },
            {
                "ticker": "TFC",
                "allocation_pct": 20.0,
                "entry_rationale": "Conventional bond (invalid)",
                "risk_level": "low",
            },
            {
                "ticker": "P01GIS230525",
                "allocation_pct": 20.0,
                "entry_rationale": "Halal fixed income",
                "instrument_type": "gis_sukuk",
                "shariah_compliant": True,
                "risk_level": "low",
            },
        ],
        "cash_allocation_pct": 0.0,
        "expected_portfolio_return_pct": 11.0,
    }
    portfolio = builder.build(
        gemini_output,
        1_000_000,
        snapshot.quotes,
        [],
        [],
        shariah_mode=True,
        snapshot=snapshot,
    )
    tickers = {p.ticker for p in portfolio.positions}
    assert "TFC" not in tickers
    assert "P01GIS230525" in tickers
    assert portfolio.shariah_compliant is True
