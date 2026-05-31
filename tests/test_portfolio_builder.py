"""Tests for PortfolioBuilder."""

from __future__ import annotations

import pytest

from app.models import InvestmentMode, StockQuote
from app.portfolio.builder import PortfolioBuilder


@pytest.fixture
def builder():
    return PortfolioBuilder()


@pytest.fixture
def gemini_output():
    return {
        "reasoning_summary": "Strong fundamentals in fertilizer sector.",
        "risk_assessment": "medium",
        "positions": [
            {
                "ticker": "ENGRO",
                "allocation_pct": 15.0,
                "direction": "bullish",
                "entry_rationale": "Record profits, high volume.",
                "stop_loss_pct": 7.0,
                "target_return_pct": 18.0,
                "risk_level": "medium",
                "key_risks": ["commodity price risk"],
            },
            {
                "ticker": "HBL",
                "allocation_pct": 10.0,
                "direction": "bullish",
                "entry_rationale": "Banking sector momentum.",
                "stop_loss_pct": 5.0,
                "target_return_pct": 12.0,
                "risk_level": "low",
                "key_risks": ["interest rate risk"],
            },
        ],
        "cash_allocation_pct": 75.0,
        "expected_portfolio_return_pct": 14.0,
        "conflicts_addressed": [],
    }


@pytest.fixture
def quotes():
    return [
        StockQuote(symbol="ENGRO", current_price=285.50, company_name="Engro Corp",
                   sector="Fertilizer", volume=1_500_000),
        StockQuote(symbol="HBL", current_price=155.25, company_name="Habib Bank",
                   sector="Banking", volume=3_200_000),
    ]


def test_build_returns_portfolio(builder, gemini_output, quotes):
    portfolio = builder.build(gemini_output, 1_000_000, quotes, [], [])
    assert portfolio is not None
    assert portfolio.total_capital_pkr == 1_000_000


def test_build_creates_correct_positions(builder, gemini_output, quotes):
    portfolio = builder.build(gemini_output, 1_000_000, quotes, [], [])
    assert len(portfolio.positions) == 2
    tickers = {p.ticker for p in portfolio.positions}
    assert "ENGRO" in tickers
    assert "HBL" in tickers


def test_build_computes_capital_pkr(builder, gemini_output, quotes):
    portfolio = builder.build(gemini_output, 1_000_000, quotes, [], [])
    engro = next(p for p in portfolio.positions if p.ticker == "ENGRO")
    assert engro.capital_pkr == pytest.approx(150_000, abs=10)


def test_build_computes_shares(builder, gemini_output, quotes):
    portfolio = builder.build(gemini_output, 1_000_000, quotes, [], [])
    engro = next(p for p in portfolio.positions if p.ticker == "ENGRO")
    assert engro.shares == int(150_000 / 285.50)


def test_build_stop_loss_below_entry(builder, gemini_output, quotes):
    portfolio = builder.build(
        gemini_output, 1_000_000, quotes, [], [], investment_mode=InvestmentMode.TACTICAL
    )
    for pos in portfolio.positions:
        if pos.entry_price > 0:
            assert pos.stop_loss is not None
            assert pos.stop_loss < pos.entry_price


def test_build_target_above_entry(builder, gemini_output, quotes):
    portfolio = builder.build(
        gemini_output, 1_000_000, quotes, [], [], investment_mode=InvestmentMode.TACTICAL
    )
    for pos in portfolio.positions:
        if pos.entry_price > 0:
            assert pos.target_price is not None
            assert pos.target_price > pos.entry_price


def test_max_allocation_clamped(builder, quotes):
    output = {
        "reasoning_summary": "Test",
        "risk_assessment": "high",
        "positions": [
            {"ticker": "ENGRO", "allocation_pct": 50.0,   # > 20% cap
             "entry_rationale": "", "stop_loss_pct": 5, "target_return_pct": 10,
             "risk_level": "high", "key_risks": []},
        ],
        "cash_allocation_pct": 80.0,
        "expected_portfolio_return_pct": 10.0,
        "conflicts_addressed": [],
    }
    portfolio = builder.build(output, 1_000_000, quotes, [], [])
    for pos in portfolio.positions:
        assert pos.allocation_pct <= 20.0


def test_portfolio_has_sharpe(builder, gemini_output, quotes):
    portfolio = builder.build(gemini_output, 1_000_000, quotes, [], [])
    assert portfolio.sharpe_ratio is not None


def test_portfolio_id_is_uuid(builder, gemini_output, quotes):
    import uuid
    portfolio = builder.build(gemini_output, 1_000_000, quotes, [], [])
    assert uuid.UUID(portfolio.id)  # raises if invalid


def test_tactical_mode_sets_stop_loss_and_target_price(builder, quotes):
    output = {
        "reasoning_summary": "Momentum confirmed by board volume.",
        "risk_assessment": "medium",
        "positions": [
            {
                "ticker": "ENGRO",
                "allocation_pct": 15.0,
                "entry_rationale": "Breakout on volume.",
                "hold_duration_days": 7,
                "stop_loss_pct": 7.0,
                "thesis_invalidation_conditions": [
                    "Volume falls below 5-day average",
                    "Breakout level fails",
                ],
                "target_return_pct": 8,
                "risk_level": "medium",
            }
        ],
        "cash_allocation_pct": 85.0,
        "expected_portfolio_return_pct": 8.0,
    }

    portfolio = builder.build(
        output,
        1_000_000,
        quotes,
        [],
        [],
        investment_mode=InvestmentMode.TACTICAL,
    )
    pos = portfolio.positions[0]
    assert portfolio.investment_mode == InvestmentMode.TACTICAL
    assert pos.stop_loss is not None
    assert pos.target_price is not None
    assert pos.stop_loss < pos.entry_price
    assert pos.target_price > pos.entry_price
    assert pos.hold_duration_days == 7
    assert "Breakout level fails" in pos.thesis_invalidation_conditions


def test_fundamental_mode_preserves_rebalancing_metadata(builder, quotes):
    output = {
        "reasoning_summary": "Sector earnings outlook is constructive.",
        "risk_assessment": "medium",
        "positions": [
            {
                "ticker": "HBL",
                "allocation_pct": 10.0,
                "entry_rationale": "Rate-cycle and earnings support.",
                "sector_outlook": "Banks benefit from asset repricing.",
                "range_52w_position": "mid range",
                "ytd_trend": "positive",
                "rebalancing_triggers": ["NIM compression", "Asset quality deterioration"],
                "target_return_pct": 12,
                "risk_level": "low",
            }
        ],
        "cash_allocation_pct": 90.0,
        "expected_portfolio_return_pct": 12.0,
    }

    portfolio = builder.build(
        output,
        1_000_000,
        quotes,
        [],
        [],
        investment_mode=InvestmentMode.FUNDAMENTAL,
    )
    pos = portfolio.positions[0]
    assert portfolio.investment_mode == InvestmentMode.FUNDAMENTAL
    assert pos.sector_outlook == "Banks benefit from asset repricing."
    assert pos.range_52w_position == "mid range"
    assert pos.ytd_trend == "positive"
    assert "NIM compression" in pos.rebalancing_triggers
    assert pos.stop_loss is None
    assert pos.target_price is None
