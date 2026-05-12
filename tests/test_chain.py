"""
Tests for ActionChain orchestrator.
All external I/O (scrapers, Gemini) is mocked — no network required.
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.chain import ActionChain
from app.models import (
    ActionStatus,
    ActionType,
    AgentRun,
    MarketSnapshot,
    Portfolio,
    RiskLevel,
    Signal,
    SignalDirection,
    SignalSource,
    StockQuote,
)


# ─── Shared mock data ──────────────────────────────────────────────────────────

def _make_snapshot() -> MarketSnapshot:
    return MarketSnapshot(
        kse100_index=75_000.0,
        kse100_change=+350.0,
        advances=180,
        declines=120,
        quotes=[
            StockQuote(symbol="ENGRO", current_price=285.50,
                       change_pct=1.96, volume=1_500_000),
            StockQuote(symbol="HBL", current_price=155.25,
                       change_pct=1.47, volume=3_200_000),
        ],
    )


def _make_gemini_output() -> dict:
    return {
        "reasoning_summary": "Strong signals across fertilizer and banking.",
        "macro_outlook": "SBP rate cut expected.",
        "risk_assessment": "medium",
        "positions": [
            {"ticker": "ENGRO", "allocation_pct": 15.0, "direction": "bullish",
             "entry_rationale": "Record profits.", "stop_loss_pct": 7.0,
             "target_return_pct": 18.0, "risk_level": "medium", "key_risks": []},
            {"ticker": "HBL", "allocation_pct": 10.0, "direction": "bullish",
             "entry_rationale": "Banking momentum.", "stop_loss_pct": 5.0,
             "target_return_pct": 12.0, "risk_level": "low", "key_risks": []},
        ],
        "cash_allocation_pct": 75.0,
        "expected_portfolio_return_pct": 14.0,
        "conflicts_addressed": [],
    }


# ─── Happy path ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chain_returns_agent_run():
    snapshot = _make_snapshot()

    with (
        patch("app.chain.PSXScraper") as MockPSX,
        patch("app.chain.NewsScraper") as MockNews,
        patch("app.chain.GeminiAgent") as MockGemini,
    ):
        # PSXScraper context manager
        mock_psx_inst = AsyncMock()
        mock_psx_inst.scrape = AsyncMock(return_value=snapshot)
        MockPSX.return_value.__aenter__ = AsyncMock(return_value=mock_psx_inst)
        MockPSX.return_value.__aexit__ = AsyncMock(return_value=False)

        # NewsScraper context manager
        mock_news_inst = AsyncMock()
        mock_news_inst.scrape = AsyncMock(return_value=[])
        MockNews.return_value.__aenter__ = AsyncMock(return_value=mock_news_inst)
        MockNews.return_value.__aexit__ = AsyncMock(return_value=False)

        # Gemini agent
        mock_gemini = MockGemini.return_value
        mock_gemini.reason = AsyncMock(return_value=_make_gemini_output())

        chain = ActionChain()
        run = await chain.execute(capital_pkr=1_000_000, max_positions=10)

    assert isinstance(run, AgentRun)
    assert run.status == ActionStatus.COMPLETED


@pytest.mark.asyncio
async def test_chain_has_five_steps():
    snapshot = _make_snapshot()

    with (
        patch("app.chain.PSXScraper") as MockPSX,
        patch("app.chain.NewsScraper") as MockNews,
        patch("app.chain.GeminiAgent") as MockGemini,
    ):
        mock_psx_inst = AsyncMock()
        mock_psx_inst.scrape = AsyncMock(return_value=snapshot)
        MockPSX.return_value.__aenter__ = AsyncMock(return_value=mock_psx_inst)
        MockPSX.return_value.__aexit__ = AsyncMock(return_value=False)

        mock_news_inst = AsyncMock()
        mock_news_inst.scrape = AsyncMock(return_value=[])
        MockNews.return_value.__aenter__ = AsyncMock(return_value=mock_news_inst)
        MockNews.return_value.__aexit__ = AsyncMock(return_value=False)

        MockGemini.return_value.reason = AsyncMock(return_value=_make_gemini_output())

        chain = ActionChain()
        run = await chain.execute()

    assert len(run.steps) == 5
    action_types = [s.action_type for s in run.steps]
    assert ActionType.SCRAPE_MARKET_DATA in action_types
    assert ActionType.SCRAPE_NEWS in action_types
    assert ActionType.EXTRACT_SIGNALS in action_types
    assert ActionType.RESOLVE_CONFLICTS in action_types
    assert ActionType.CONSTRUCT_PORTFOLIO in action_types


@pytest.mark.asyncio
async def test_chain_steps_all_completed():
    snapshot = _make_snapshot()

    with (
        patch("app.chain.PSXScraper") as MockPSX,
        patch("app.chain.NewsScraper") as MockNews,
        patch("app.chain.GeminiAgent") as MockGemini,
    ):
        mock_psx_inst = AsyncMock()
        mock_psx_inst.scrape = AsyncMock(return_value=snapshot)
        MockPSX.return_value.__aenter__ = AsyncMock(return_value=mock_psx_inst)
        MockPSX.return_value.__aexit__ = AsyncMock(return_value=False)

        mock_news_inst = AsyncMock()
        mock_news_inst.scrape = AsyncMock(return_value=[])
        MockNews.return_value.__aenter__ = AsyncMock(return_value=mock_news_inst)
        MockNews.return_value.__aexit__ = AsyncMock(return_value=False)

        MockGemini.return_value.reason = AsyncMock(return_value=_make_gemini_output())

        chain = ActionChain()
        run = await chain.execute()

    for step in run.steps:
        assert step.status == ActionStatus.COMPLETED, f"Step {step.step_number} not completed"


@pytest.mark.asyncio
async def test_chain_steps_have_timing():
    snapshot = _make_snapshot()

    with (
        patch("app.chain.PSXScraper") as MockPSX,
        patch("app.chain.NewsScraper") as MockNews,
        patch("app.chain.GeminiAgent") as MockGemini,
    ):
        mock_psx_inst = AsyncMock()
        mock_psx_inst.scrape = AsyncMock(return_value=snapshot)
        MockPSX.return_value.__aenter__ = AsyncMock(return_value=mock_psx_inst)
        MockPSX.return_value.__aexit__ = AsyncMock(return_value=False)

        mock_news_inst = AsyncMock()
        mock_news_inst.scrape = AsyncMock(return_value=[])
        MockNews.return_value.__aenter__ = AsyncMock(return_value=mock_news_inst)
        MockNews.return_value.__aexit__ = AsyncMock(return_value=False)

        MockGemini.return_value.reason = AsyncMock(return_value=_make_gemini_output())

        chain = ActionChain()
        run = await chain.execute()

    for step in run.steps:
        assert step.duration_ms is not None
        assert step.duration_ms >= 0
        assert step.started_at is not None
        assert step.completed_at is not None


@pytest.mark.asyncio
async def test_chain_portfolio_is_built():
    snapshot = _make_snapshot()

    with (
        patch("app.chain.PSXScraper") as MockPSX,
        patch("app.chain.NewsScraper") as MockNews,
        patch("app.chain.GeminiAgent") as MockGemini,
    ):
        mock_psx_inst = AsyncMock()
        mock_psx_inst.scrape = AsyncMock(return_value=snapshot)
        MockPSX.return_value.__aenter__ = AsyncMock(return_value=mock_psx_inst)
        MockPSX.return_value.__aexit__ = AsyncMock(return_value=False)

        mock_news_inst = AsyncMock()
        mock_news_inst.scrape = AsyncMock(return_value=[])
        MockNews.return_value.__aenter__ = AsyncMock(return_value=mock_news_inst)
        MockNews.return_value.__aexit__ = AsyncMock(return_value=False)

        MockGemini.return_value.reason = AsyncMock(return_value=_make_gemini_output())

        chain = ActionChain()
        run = await chain.execute(capital_pkr=1_000_000)

    assert run.portfolio is not None
    assert isinstance(run.portfolio, Portfolio)
    assert run.portfolio.total_capital_pkr == 1_000_000
    assert len(run.portfolio.positions) == 2


# ─── Failure isolation ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chain_survives_scraper_failure():
    """If PSX scraper fails, the run continues with an empty snapshot."""
    with (
        patch("app.chain.PSXScraper") as MockPSX,
        patch("app.chain.NewsScraper") as MockNews,
        patch("app.chain.GeminiAgent") as MockGemini,
    ):
        # PSX scraper raises
        mock_psx_inst = AsyncMock()
        mock_psx_inst.scrape = AsyncMock(side_effect=Exception("Network error"))
        MockPSX.return_value.__aenter__ = AsyncMock(return_value=mock_psx_inst)
        MockPSX.return_value.__aexit__ = AsyncMock(return_value=False)

        mock_news_inst = AsyncMock()
        mock_news_inst.scrape = AsyncMock(return_value=[])
        MockNews.return_value.__aenter__ = AsyncMock(return_value=mock_news_inst)
        MockNews.return_value.__aexit__ = AsyncMock(return_value=False)

        MockGemini.return_value.reason = AsyncMock(return_value=_make_gemini_output())

        chain = ActionChain()
        run = await chain.execute()

    step1 = run.steps[0]
    assert step1.status == ActionStatus.FAILED
    assert "Network error" in (step1.error or "")
    # Run should still have subsequent steps attempted
    assert len(run.steps) == 5


@pytest.mark.asyncio
async def test_chain_run_id_is_unique():
    """Two sequential runs must have different run IDs."""
    snapshot = _make_snapshot()

    async def _run():
        with (
            patch("app.chain.PSXScraper") as MockPSX,
            patch("app.chain.NewsScraper") as MockNews,
            patch("app.chain.GeminiAgent") as MockGemini,
        ):
            mock_psx_inst = AsyncMock()
            mock_psx_inst.scrape = AsyncMock(return_value=snapshot)
            MockPSX.return_value.__aenter__ = AsyncMock(return_value=mock_psx_inst)
            MockPSX.return_value.__aexit__ = AsyncMock(return_value=False)

            mock_news_inst = AsyncMock()
            mock_news_inst.scrape = AsyncMock(return_value=[])
            MockNews.return_value.__aenter__ = AsyncMock(return_value=mock_news_inst)
            MockNews.return_value.__aexit__ = AsyncMock(return_value=False)

            MockGemini.return_value.reason = AsyncMock(return_value=_make_gemini_output())

            return await ActionChain().execute()

    run1 = await _run()
    run2 = await _run()
    assert run1.run_id != run2.run_id
