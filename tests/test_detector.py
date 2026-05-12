"""Tests for ContradictionDetector."""

from __future__ import annotations

import pytest

from app.models import Signal, SignalDirection, SignalSource
from app.signals.detector import ContradictionDetector


@pytest.fixture
def detector():
    return ContradictionDetector()


def _sig(ticker, direction, source, confidence) -> Signal:
    return Signal(
        ticker=ticker,
        direction=direction,
        source=source,
        confidence=confidence,
        rationale="test",
    )


class TestDirectionConflict:
    def test_detects_bullish_vs_bearish(self, detector):
        grouped = {
            "ENGRO": [
                _sig("ENGRO", SignalDirection.BULLISH, SignalSource.PSX_MARKET, 0.75),
                _sig("ENGRO", SignalDirection.BEARISH, SignalSource.DAWN_BUSINESS, 0.60),
            ]
        }
        reports = detector.detect(grouped)
        types = [r.conflict_type for r in reports]
        assert "bullish_vs_bearish" in types

    def test_no_conflict_same_direction(self, detector):
        grouped = {
            "HBL": [
                _sig("HBL", SignalDirection.BULLISH, SignalSource.PSX_MARKET, 0.70),
                _sig("HBL", SignalDirection.BULLISH, SignalSource.ARY_BUSINESS, 0.55),
            ]
        }
        reports = detector.detect(grouped)
        types = [r.conflict_type for r in reports]
        assert "bullish_vs_bearish" not in types

    def test_resolution_favors_higher_confidence(self, detector):
        grouped = {
            "LUCK": [
                _sig("LUCK", SignalDirection.BULLISH, SignalSource.PSX_MARKET, 0.85),
                _sig("LUCK", SignalDirection.BEARISH, SignalSource.DAWN_BUSINESS, 0.40),
            ]
        }
        reports = detector.detect(grouped)
        conflict = next(r for r in reports if r.conflict_type == "bullish_vs_bearish")
        assert conflict.resolution == SignalDirection.BULLISH


class TestSourceDisagreement:
    def test_detects_market_vs_news_disagreement(self, detector):
        grouped = {
            "OGDC": [
                _sig("OGDC", SignalDirection.BULLISH, SignalSource.PSX_MARKET, 0.70),
                _sig("OGDC", SignalDirection.BEARISH, SignalSource.DAWN_BUSINESS, 0.65),
            ]
        }
        reports = detector.detect(grouped)
        types = [r.conflict_type for r in reports]
        assert "source_disagreement" in types

    def test_resolution_defers_to_market_data(self, detector):
        grouped = {
            "OGDC": [
                _sig("OGDC", SignalDirection.BULLISH, SignalSource.PSX_MARKET, 0.70),
                _sig("OGDC", SignalDirection.BEARISH, SignalSource.DAWN_BUSINESS, 0.65),
            ]
        }
        reports = detector.detect(grouped)
        sd = next(r for r in reports if r.conflict_type == "source_disagreement")
        assert sd.resolution == SignalDirection.BULLISH


class TestConfidenceSpread:
    def test_detects_wide_confidence_gap(self, detector):
        grouped = {
            "PPL": [
                _sig("PPL", SignalDirection.BULLISH, SignalSource.PSX_MARKET, 0.90),
                _sig("PPL", SignalDirection.BULLISH, SignalSource.DAWN_BUSINESS, 0.40),
            ]
        }
        reports = detector.detect(grouped)
        types = [r.conflict_type for r in reports]
        assert "confidence_spread" in types

    def test_no_spread_conflict_when_close(self, detector):
        grouped = {
            "FFC": [
                _sig("FFC", SignalDirection.BULLISH, SignalSource.PSX_MARKET, 0.70),
                _sig("FFC", SignalDirection.BULLISH, SignalSource.ARY_BUSINESS, 0.65),
            ]
        }
        reports = detector.detect(grouped)
        types = [r.conflict_type for r in reports]
        assert "confidence_spread" not in types


class TestApplyResolutions:
    def test_apply_resolutions_uses_report(self, detector):
        grouped = {
            "ENGRO": [
                _sig("ENGRO", SignalDirection.BULLISH, SignalSource.PSX_MARKET, 0.80),
                _sig("ENGRO", SignalDirection.BEARISH, SignalSource.DAWN_BUSINESS, 0.50),
            ]
        }
        reports = detector.detect(grouped)
        resolved = detector.apply_resolutions(grouped, reports)
        assert "ENGRO" in resolved

    def test_no_conflict_majority_vote(self, detector):
        grouped = {
            "KAPCO": [
                _sig("KAPCO", SignalDirection.BULLISH, SignalSource.PSX_MARKET, 0.70),
                _sig("KAPCO", SignalDirection.BULLISH, SignalSource.DAWN_BUSINESS, 0.60),
                _sig("KAPCO", SignalDirection.NEUTRAL, SignalSource.ARY_BUSINESS, 0.30),
            ]
        }
        resolved = detector.apply_resolutions(grouped, [])
        assert resolved["KAPCO"] == SignalDirection.BULLISH
