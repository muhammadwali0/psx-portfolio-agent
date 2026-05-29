"""Unit tests for pipeline intelligence gaps resolution."""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock

from app.scrapers.news_scraper import _extract_tickers
from app.agent.gemini_agent import GeminiAgent
from app.models import MarketSnapshot, RiskLevel, Signal, ConflictReport, NewsArticle


def test_extract_tickers_exact_symbols():
    text = "ENGRO reports high earnings while HBL sees modest growth and OGDC rises."
    tickers = _extract_tickers(text)
    assert set(tickers) == {"ENGRO", "HBL", "OGDC"}


def test_extract_tickers_company_names_and_abbreviations():
    # Engro Corporation -> ENGRO, Habib Bank -> HBL, Oil & Gas Development -> OGDC, Lucky Cement -> LUCK
    text = "Engro Corporation and Habib Bank announced joint venture. Oil & Gas Development shares were traded heavily. Lucky Cement also rose."
    tickers = _extract_tickers(text)
    assert set(tickers) == {"ENGRO", "HBL", "OGDC", "LUCK"}


def test_extract_tickers_case_insensitive():
    text = "engro corp declared dividend. habib bank also announced new profits. ogdc and hubco were stable."
    tickers = _extract_tickers(text)
    assert set(tickers) == {"ENGRO", "HBL", "OGDC", "HUBC"}


def test_extract_tickers_word_boundaries():
    # Make sure substring matching doesn't occur where it shouldn't
    # "policypages" contains "ici" (Lucky Core Industries ticker), should NOT match
    # "lucky cementco" contains "lucky cement", but has trailing "co" so should NOT match LUCK
    text = "The policy pages had some details. The lucky cementco facility was inspected."
    tickers = _extract_tickers(text)
    assert tickers == []


def test_extract_tickers_longest_match_first():
    # "Engro Corporation" contains "Engro". Longest match should win, returning ENGRO exactly once.
    text = "The board of Engro Corporation decided to expand."
    tickers = _extract_tickers(text)
    assert tickers == ["ENGRO"]


def test_gemini_prompt_diversification_instruction():
    # Initialize agent
    # Mock settings so genai configure doesn't require real key/models
    agent = GeminiAgent()
    
    # Create empty/minimal mock inputs
    snapshot = MarketSnapshot(
        kse100_index=75000.0,
        kse100_change=1.2,
        advances=150,
        declines=50,
        quotes=[],
    )
    
    # 1. No diversification when capital <= 500,000 or max_positions < 5
    prompt_small_capital = agent._build_prompt(
        signals=[],
        conflicts=[],
        snapshot=snapshot,
        articles=[],
        capital_pkr=500000,
        risk_preference=RiskLevel.MEDIUM,
        max_positions=5,
    )
    assert "DIVERSIFICATION INSTRUCTION" not in prompt_small_capital

    prompt_low_positions = agent._build_prompt(
        signals=[],
        conflicts=[],
        snapshot=snapshot,
        articles=[],
        capital_pkr=600000,
        risk_preference=RiskLevel.MEDIUM,
        max_positions=4,
    )
    assert "DIVERSIFICATION INSTRUCTION" not in prompt_low_positions

    # 2. Add diversification instruction when capital > 500,000 and max_positions >= 5
    prompt_diversified = agent._build_prompt(
        signals=[],
        conflicts=[],
        snapshot=snapshot,
        articles=[],
        capital_pkr=500001,
        risk_preference=RiskLevel.MEDIUM,
        max_positions=5,
    )
    assert "DIVERSIFICATION INSTRUCTION" in prompt_diversified
    assert "spread positions across at least 3 different sectors" in prompt_diversified
    assert "avoid allocating more than 40% to any single sector" in prompt_diversified
    assert "consider mid-confidence signals from underrepresented sectors" in prompt_diversified
