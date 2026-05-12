"""Shared pytest fixtures."""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import create_app
from app.models import (
    MarketSnapshot,
    NewsArticle,
    Signal,
    SignalDirection,
    SignalSource,
    StockQuote,
)
from app.store import RunStore


# ─── App / HTTP client ────────────────────────────────────────────────────────

@pytest.fixture
def app():
    return create_app()


@pytest_asyncio.fixture
async def client(app):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


# ─── Domain fixtures ──────────────────────────────────────────────────────────

@pytest.fixture
def sample_quote() -> StockQuote:
    return StockQuote(
        symbol="ENGRO",
        company_name="Engro Corporation",
        sector="Fertilizer",
        current_price=285.50,
        open_price=280.00,
        high_price=290.00,
        low_price=278.00,
        prev_close=280.00,
        volume=1_500_000,
    )


@pytest.fixture
def sample_snapshot(sample_quote) -> MarketSnapshot:
    return MarketSnapshot(
        kse100_index=75_000.0,
        kse100_change=+350.0,
        kse100_change_pct=+0.47,
        advances=180,
        declines=120,
        quotes=[sample_quote],
    )


@pytest.fixture
def sample_article() -> NewsArticle:
    return NewsArticle(
        title="ENGRO posts record profits amid fertilizer boom",
        url="https://www.dawn.com/news/1234567",
        source=SignalSource.DAWN_BUSINESS,
        summary="Engro Corporation reported record quarterly earnings driven by strong fertilizer demand.",
        tickers_mentioned=["ENGRO"],
    )


@pytest.fixture
def sample_signal() -> Signal:
    return Signal(
        ticker="ENGRO",
        direction=SignalDirection.BULLISH,
        source=SignalSource.PSX_MARKET,
        confidence=0.75,
        rationale="ENGRO moved +1.96% on volume 1,500,000.",
    )


@pytest.fixture(autouse=True)
def clear_store():
    """Reset the run store between tests."""
    RunStore.instance().clear()
    yield
    RunStore.instance().clear()
