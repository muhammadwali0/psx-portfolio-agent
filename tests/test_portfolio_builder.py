"""Tests for PortfolioBuilder."""

from __future__ import annotations

import pytest

from app.models import RiskLevel, Signal, SignalDirection, SignalSource, StockQuote
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
    portfolio = builder.build(gemini_output, 1_000_000, quotes, [], [])
    for pos in portfolio.positions:
        if pos.entry_price > 0:
            assert pos.stop_loss < pos.entry_price


def test_build_target_above_entry(builder, gemini_output, quotes):
    portfolio = builder.build(gemini_output, 1_000_000, quotes, [], [])
    for pos in portfolio.positions:
        if pos.entry_price > 0:
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
