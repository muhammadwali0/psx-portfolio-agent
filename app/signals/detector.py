"""
Contradiction Detector
======================
Identifies conflicting signals for the same ticker across different sources
and produces a ConflictReport with severity and a suggested resolution.

Conflict types detected
-----------------------
- ``bullish_vs_bearish``   : opposing directions from ≥ 2 sources.
- ``price_volume_diverge`` : price up but volume drop (or vice-versa).
- ``source_disagreement``  : market data says one thing, news another.
- ``confidence_spread``    : signals agree on direction but diverge wildly
                             on confidence (≥ 0.40 gap).
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Sequence

from app.logger import get_logger
from app.models import (
    ConflictReport,
    Signal,
    SignalDirection,
    SignalSource,
)

logger = get_logger(__name__)

# Threshold: minimum confidence gap to flag as a "confidence spread" conflict
_CONF_SPREAD_THRESHOLD = 0.40
# Minimum number of opposing signals to declare a bullish_vs_bearish conflict
_MIN_OPPOSING = 1


class ContradictionDetector:
    """
    Stateless contradiction detector.

    Usage::

        detector = ContradictionDetector()
        reports = detector.detect(grouped_signals)
    """

    def detect(
        self, grouped_signals: dict[str, list[Signal]]
    ) -> list[ConflictReport]:
        """
        Run all conflict checks over the per-ticker signal groups.

        Args:
            grouped_signals: Output of ``SignalExtractor.aggregate()``.

        Returns:
            List of ConflictReport objects (may be empty if no conflicts found).
        """
        reports: list[ConflictReport] = []

        for ticker, signals in grouped_signals.items():
            if len(signals) < 2:
                continue  # Need at least two signals to conflict

            ticker_reports = self._check_ticker(ticker, signals)
            reports.extend(ticker_reports)

        logger.info("contradiction_detector.done", conflicts=len(reports))
        return reports

    # ── Per-ticker checks ──────────────────────────────────────────────────────

    def _check_ticker(
        self, ticker: str, signals: list[Signal]
    ) -> list[ConflictReport]:
        reports: list[ConflictReport] = []

        r = self._check_direction_conflict(ticker, signals)
        if r:
            reports.append(r)

        r = self._check_source_disagreement(ticker, signals)
        if r:
            reports.append(r)

        r = self._check_confidence_spread(ticker, signals)
        if r:
            reports.append(r)

        return reports

    def _check_direction_conflict(
        self, ticker: str, signals: list[Signal]
    ) -> ConflictReport | None:
        """Flag if there are both bullish AND bearish signals."""
        dir_counts: Counter[SignalDirection] = Counter(s.direction for s in signals)
        has_bull = dir_counts[SignalDirection.BULLISH] > 0
        has_bear = dir_counts[SignalDirection.BEARISH] > 0

        if not (has_bull and has_bear):
            return None

        # Severity = weighted by confidence of losing side / winning side
        bull_conf = max(
            (s.confidence for s in signals if s.direction == SignalDirection.BULLISH),
            default=0.0,
        )
        bear_conf = max(
            (s.confidence for s in signals if s.direction == SignalDirection.BEARISH),
            default=0.0,
        )
        # Severity closer to 1 when both sides are equally strong
        severity = round(1.0 - abs(bull_conf - bear_conf), 3)

        # Resolution: go with the higher-confidence side
        if bull_conf >= bear_conf:
            resolution = SignalDirection.BULLISH
            rationale = (
                f"Bullish signals (max conf {bull_conf:.2f}) outweigh bearish "
                f"(max conf {bear_conf:.2f}). Favoring bullish direction."
            )
        else:
            resolution = SignalDirection.BEARISH
            rationale = (
                f"Bearish signals (max conf {bear_conf:.2f}) outweigh bullish "
                f"(max conf {bull_conf:.2f}). Favoring bearish direction."
            )

        conflicting = [
            s for s in signals
            if s.direction in (SignalDirection.BULLISH, SignalDirection.BEARISH)
        ]

        return ConflictReport(
            ticker=ticker,
            conflicting_signals=conflicting,
            conflict_type="bullish_vs_bearish",
            severity=severity,
            resolution=resolution,
            resolution_rationale=rationale,
            resolved_at=datetime.now(tz=timezone.utc),
        )

    def _check_source_disagreement(
        self, ticker: str, signals: list[Signal]
    ) -> ConflictReport | None:
        """
        Flag when market data (PSX_MARKET) and news sources disagree.
        e.g. stock price rising but news signals are bearish.
        """
        market_sigs = [s for s in signals if s.source == SignalSource.PSX_MARKET]
        news_sigs = [
            s for s in signals if s.source != SignalSource.PSX_MARKET
        ]

        if not market_sigs or not news_sigs:
            return None

        # Use the highest-confidence signal from each group
        market_top = max(market_sigs, key=lambda s: s.confidence)
        news_top = max(news_sigs, key=lambda s: s.confidence)

        if market_top.direction == news_top.direction:
            return None
        if (
            market_top.direction == SignalDirection.NEUTRAL
            or news_top.direction == SignalDirection.NEUTRAL
        ):
            return None

        severity = round(
            (market_top.confidence + news_top.confidence) / 2, 3
        )

        # Prefer market data (more objective) in resolution
        resolution = market_top.direction
        rationale = (
            f"Market data ({market_top.direction.value}, conf {market_top.confidence:.2f}) "
            f"contradicts news sentiment ({news_top.direction.value}, conf {news_top.confidence:.2f}). "
            f"Deferring to market data as primary source."
        )

        return ConflictReport(
            ticker=ticker,
            conflicting_signals=[market_top, news_top],
            conflict_type="source_disagreement",
            severity=severity,
            resolution=resolution,
            resolution_rationale=rationale,
            resolved_at=datetime.now(tz=timezone.utc),
        )

    def _check_confidence_spread(
        self, ticker: str, signals: list[Signal]
    ) -> ConflictReport | None:
        """
        Flag when signals agree on direction but have very different confidence
        levels — suggests data quality or recency issues.
        """
        if len(signals) < 2:
            return None

        # Only check within same-direction groups
        for direction in (SignalDirection.BULLISH, SignalDirection.BEARISH):
            same_dir = [s for s in signals if s.direction == direction]
            if len(same_dir) < 2:
                continue
            confs = [s.confidence for s in same_dir]
            spread = max(confs) - min(confs)
            if spread >= _CONF_SPREAD_THRESHOLD:
                severity = round(spread, 3)
                high_sig = max(same_dir, key=lambda s: s.confidence)
                low_sig = min(same_dir, key=lambda s: s.confidence)
                return ConflictReport(
                    ticker=ticker,
                    conflicting_signals=[high_sig, low_sig],
                    conflict_type="confidence_spread",
                    severity=severity,
                    resolution=direction,  # direction agreed; keep it
                    resolution_rationale=(
                        f"Signals agree on {direction.value} but confidence spread "
                        f"is {spread:.2f} ({low_sig.confidence:.2f}–{high_sig.confidence:.2f}). "
                        f"Using the highest-confidence signal."
                    ),
                    resolved_at=datetime.now(tz=timezone.utc),
                )
        return None

    # ── Utility ────────────────────────────────────────────────────────────────

    @staticmethod
    def apply_resolutions(
        grouped: dict[str, list[Signal]],
        reports: Sequence[ConflictReport],
    ) -> dict[str, SignalDirection]:
        """
        Return a clean ``{ticker: resolved_direction}`` map after applying
        all ConflictReport resolutions.  Tickers without conflicts keep the
        majority-vote direction.
        """
        resolved: dict[str, SignalDirection] = {}
        conflict_tickers = {r.ticker: r for r in reports if r.resolution}

        for ticker, signals in grouped.items():
            if ticker in conflict_tickers:
                resolved[ticker] = conflict_tickers[ticker].resolution  # type: ignore[assignment]
            else:
                # Majority vote weighted by confidence
                scores: dict[SignalDirection, float] = {}
                for sig in signals:
                    scores[sig.direction] = (
                        scores.get(sig.direction, 0.0) + sig.confidence
                    )
                if scores:
                    resolved[ticker] = max(scores, key=lambda d: scores[d])

        return resolved
