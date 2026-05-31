"""
Signal Extractor
================
Converts raw market data (StockQuote objects) and news articles into
typed Signal objects with direction, confidence, and rationale.

Two extraction strategies:
  1. **Market signals** — derived from price/volume statistics.
  2. **News signals** — rule-based sentiment heuristics on article text
     (the Gemini agent layer re-scores these with deeper NLP later).
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Sequence

from app.logger import get_logger
from app.models import (
    MarketSnapshot,
    NewsArticle,
    Signal,
    SignalDirection,
    SignalSource,
    StockQuote,
)

if TYPE_CHECKING:
    from app.models import SymbolHistoricalContext

logger = get_logger(__name__)


# ─── Keyword-based sentiment lexicon ─────────────────────────────────────────
# Score: +1 bullish, -1 bearish, 0 neutral

_BULLISH_TERMS: frozenset[str] = frozenset([
    "surge", "surged", "rally", "rallied", "gain", "gained", "rise", "rose",
    "profit", "earnings", "dividend", "record", "high", "upgrade", "buy",
    "outperform", "expansion", "growth", "award", "contract", "export",
    "acquisition", "merger", "investment", "strong", "positive", "beat",
    "exceeds", "bullish", "recovery", "rebound", "approval",
])

_BEARISH_TERMS: frozenset[str] = frozenset([
    "fall", "fell", "drop", "dropped", "decline", "declined", "loss",
    "losses", "debt", "default", "downgrade", "sell", "underperform",
    "cut", "reduction", "closure", "shutdown", "fine", "penalty",
    "negative", "bearish", "crash", "slump", "weak", "miss", "missed",
    "below", "concern", "risk", "warning", "layoff", "restructuring",
])

_TOKENISE_RE = re.compile(r"[^\w\s]")


def _sentiment_score(text: str) -> float:
    """Return a sentiment score in [-1, +1] from keyword frequency."""
    tokens = _TOKENISE_RE.sub("", text.lower()).split()
    token_set = set(tokens)
    bull = len(token_set & _BULLISH_TERMS)
    bear = len(token_set & _BEARISH_TERMS)
    total = bull + bear
    if total == 0:
        return 0.0
    return (bull - bear) / total


def _direction_from_score(score: float) -> SignalDirection:
    if score > 0.1:
        return SignalDirection.BULLISH
    if score < -0.1:
        return SignalDirection.BEARISH
    return SignalDirection.NEUTRAL


# ─────────────────────────────────────────────────────────────────────────────


class SignalExtractor:
    """
    Extracts investment signals from market snapshots and news articles.

    All methods are pure functions — no I/O, easily unit-testable.
    """

    # ── Market signal extraction ───────────────────────────────────────────────

    def extract_market_signals(
        self, snapshot: MarketSnapshot
    ) -> list[Signal]:
        """
        Derive signals from each StockQuote.

        Heuristics applied (in order, each contributes to confidence):
          - Price momentum  : |change_pct| threshold → direction + base conf.
          - Volume surge    : volume vs. estimated avg boosts confidence.
          - 90-day range    : position vs. SQLite OHLCV when historical context is attached.
        """
        hist_by_symbol = (
            snapshot.historical.by_symbol if snapshot.historical else {}
        )
        signals: list[Signal] = []
        for quote in snapshot.quotes:
            ctx = hist_by_symbol.get(quote.symbol.upper())
            sig = self._quote_to_signal(quote, ctx)
            if sig:
                signals.append(sig)
        logger.info("signal_extractor.market_done", count=len(signals))
        return signals

    def _quote_to_signal(
        self,
        quote: StockQuote,
        historical: SymbolHistoricalContext | None = None,
    ) -> Signal | None:
        """Convert a single StockQuote into a Signal, or None if neutral."""
        if quote.change_pct == 0 and quote.volume == 0:
            return None

        # ── Direction & base confidence from price change ─────────────────────
        pct = quote.change_pct
        if abs(pct) < 0.5:
            direction = SignalDirection.NEUTRAL
            confidence = 0.30
        elif pct >= 0:
            direction = SignalDirection.BULLISH
            confidence = min(0.50 + abs(pct) * 0.04, 0.90)
        else:
            direction = SignalDirection.BEARISH
            confidence = min(0.50 + abs(pct) * 0.04, 0.90)

        # ── Volume factor ──────────────────────────────────────────────────────
        # Heuristic: if volume > 500k units it's notable
        if quote.volume > 2_000_000:
            confidence = min(confidence + 0.10, 0.95)
        elif quote.volume > 500_000:
            confidence = min(confidence + 0.05, 0.95)

        hist_note = ""
        if historical and quote.current_price > 0:
            if historical.ma200 and quote.current_price > historical.ma200:
                confidence = min(confidence + 0.03, 0.95)
                hist_note = " Above MA200."
            elif historical.ma200 and quote.current_price < historical.ma200:
                confidence = min(confidence + 0.03, 0.95)
                hist_note = " Below MA200."
            if historical.position_in_90d_range_pct is not None:
                if historical.position_in_90d_range_pct >= 85:
                    hist_note += f" Near 90d high ({historical.position_in_90d_range_pct:.0f}% of range)."
                elif historical.position_in_90d_range_pct <= 15:
                    hist_note += f" Near 90d low ({historical.position_in_90d_range_pct:.0f}% of range)."

        rationale = (
            f"{quote.symbol} moved {pct:+.2f}% "
            f"(open={quote.open_price:.2f}, close={quote.current_price:.2f}) "
            f"on volume {quote.volume:,}.{hist_note}"
        )

        return Signal(
            ticker=quote.symbol,
            direction=direction,
            source=SignalSource.PSX_MARKET,
            confidence=round(confidence, 3),
            rationale=rationale,
            article_url=quote.source_url,
            extracted_at=datetime.now(tz=timezone.utc),
        )

    # ── News signal extraction ─────────────────────────────────────────────────

    def extract_news_signals(
        self, articles: Sequence[NewsArticle]
    ) -> list[Signal]:
        """
        Generate a Signal per (article, ticker) pair using sentiment scoring.

        Articles with no ticker mentions are skipped.
        Articles mentioning multiple tickers generate one signal each.
        """
        signals: list[Signal] = []
        for article in articles:
            if not article.tickers_mentioned:
                continue
            combined = f"{article.title} {article.summary} {article.full_text}"
            score = _sentiment_score(combined)
            direction = _direction_from_score(score)
            # Confidence scales with |score| in [0.30, 0.75] for news signals
            confidence = round(0.30 + min(abs(score), 1.0) * 0.45, 3)

            for ticker in article.tickers_mentioned:
                signals.append(Signal(
                    ticker=ticker,
                    direction=direction,
                    source=article.source,
                    confidence=confidence,
                    rationale=(
                        f"Sentiment score {score:+.2f} from article: "
                        f'"{article.title[:100]}"'
                    ),
                    article_url=article.url,
                    extracted_at=datetime.now(tz=timezone.utc),
                    metadata={"sentiment_score": score},
                ))

        logger.info("signal_extractor.news_done", count=len(signals))
        return signals

    # ── Aggregation ────────────────────────────────────────────────────────────

    def aggregate(
        self,
        market_signals: list[Signal],
        news_signals: list[Signal],
    ) -> dict[str, list[Signal]]:
        """
        Group all signals by ticker.

        Returns: {ticker: [signals...]} sorted by confidence descending.
        """
        grouped: dict[str, list[Signal]] = {}
        for sig in market_signals + news_signals:
            grouped.setdefault(sig.ticker, []).append(sig)
        for ticker in grouped:
            grouped[ticker].sort(key=lambda s: s.confidence, reverse=True)
        return grouped
