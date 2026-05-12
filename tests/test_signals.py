"""Tests for SignalExtractor."""

from __future__ import annotations

import pytest

from app.models import MarketSnapshot, NewsArticle, SignalDirection, SignalSource, StockQuote
from app.signals.extractor import SignalExtractor, _sentiment_score


# ─── _sentiment_score unit tests ─────────────────────────────────────────────

def test_sentiment_bullish_text():
    score = _sentiment_score("ENGRO surge record profits gain dividend strong")
    assert score > 0.0


def test_sentiment_bearish_text():
    score = _sentiment_score("HBL loss debt decline fine penalty weak")
    assert score < 0.0


def test_sentiment_neutral_text():
    score = _sentiment_score("The company held its annual general meeting today.")
    assert score == 0.0


# ─── Market signal extraction ─────────────────────────────────────────────────

@pytest.fixture
def extractor():
    return SignalExtractor()


def test_market_signals_bullish(extractor, sample_quote):
    sample_quote.change_pct = 3.5
    sample_quote.volume = 1_000_000
    snap = MarketSnapshot(quotes=[sample_quote])
    signals = extractor.extract_market_signals(snap)
    assert len(signals) == 1
    assert signals[0].direction == SignalDirection.BULLISH
    assert signals[0].ticker == "ENGRO"


def test_market_signals_bearish(extractor, sample_quote):
    sample_quote.change_pct = -4.0
    snap = MarketSnapshot(quotes=[sample_quote])
    signals = extractor.extract_market_signals(snap)
    assert signals[0].direction == SignalDirection.BEARISH


def test_market_signals_neutral(extractor, sample_quote):
    sample_quote.change_pct = 0.2
    sample_quote.volume = 100
    snap = MarketSnapshot(quotes=[sample_quote])
    signals = extractor.extract_market_signals(snap)
    assert signals[0].direction == SignalDirection.NEUTRAL


def test_market_confidence_capped(extractor, sample_quote):
    sample_quote.change_pct = 100.0  # extreme mover
    snap = MarketSnapshot(quotes=[sample_quote])
    signals = extractor.extract_market_signals(snap)
    assert signals[0].confidence <= 0.95


def test_market_signal_skips_zero_rows(extractor):
    quote = StockQuote(symbol="FLAT", current_price=10.0, change_pct=0.0, volume=0)
    snap = MarketSnapshot(quotes=[quote])
    signals = extractor.extract_market_signals(snap)
    assert signals == []


# ─── News signal extraction ───────────────────────────────────────────────────

def test_news_signals_bullish(extractor, sample_article):
    signals = extractor.extract_news_signals([sample_article])
    assert len(signals) == 1
    assert signals[0].direction == SignalDirection.BULLISH
    assert signals[0].ticker == "ENGRO"


def test_news_signals_no_tickers(extractor):
    art = NewsArticle(
        title="Pakistan economy grows",
        url="http://example.com/1",
        source=SignalSource.DAWN_BUSINESS,
        tickers_mentioned=[],
    )
    signals = extractor.extract_news_signals([art])
    assert signals == []


def test_news_signals_multiple_tickers(extractor):
    art = NewsArticle(
        title="ENGRO and HBL both surge on strong earnings",
        url="http://example.com/2",
        source=SignalSource.ARY_BUSINESS,
        tickers_mentioned=["ENGRO", "HBL"],
    )
    signals = extractor.extract_news_signals([art])
    assert len(signals) == 2
    tickers = {s.ticker for s in signals}
    assert "ENGRO" in tickers
    assert "HBL" in tickers


# ─── Aggregation ──────────────────────────────────────────────────────────────

def test_aggregate_groups_by_ticker(extractor, sample_signal):
    grouped = extractor.aggregate([sample_signal], [])
    assert "ENGRO" in grouped
    assert len(grouped["ENGRO"]) == 1


def test_aggregate_sorted_by_confidence(extractor):
    from app.models import Signal
    s1 = Signal(ticker="HBL", direction=SignalDirection.BULLISH,
                source=SignalSource.PSX_MARKET, confidence=0.50, rationale="")
    s2 = Signal(ticker="HBL", direction=SignalDirection.BULLISH,
                source=SignalSource.DAWN_BUSINESS, confidence=0.80, rationale="")
    grouped = extractor.aggregate([s1, s2], [])
    assert grouped["HBL"][0].confidence == 0.80
