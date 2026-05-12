"""Shared Pydantic models used across every layer of the application."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, model_validator


# ─────────────────────────────────────────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────────────────────────────────────────

class SignalDirection(str, Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class SignalSource(str, Enum):
    PSX_MARKET = "psx_market"
    DAWN_BUSINESS = "dawn_business"
    ARY_BUSINESS = "ary_business"
    GEO_BUSINESS = "geo_business"
    GEMINI_REASONING = "gemini_reasoning"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ActionType(str, Enum):
    SCRAPE_MARKET_DATA = "scrape_market_data"
    SCRAPE_NEWS = "scrape_news"
    EXTRACT_SIGNALS = "extract_signals"
    RESOLVE_CONFLICTS = "resolve_conflicts"
    CONSTRUCT_PORTFOLIO = "construct_portfolio"
    SIMULATE_EXECUTION = "simulate_execution"


class ActionStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


# ─────────────────────────────────────────────────────────────────────────────
# PSX Market Data
# ─────────────────────────────────────────────────────────────────────────────

class StockQuote(BaseModel):
    """Live or end-of-day quote for a single PSX-listed security."""
    symbol: str = Field(..., description="PSX ticker symbol e.g. ENGRO")
    company_name: str = ""
    sector: str = ""
    current_price: float
    open_price: float = 0.0
    high_price: float = 0.0
    low_price: float = 0.0
    prev_close: float = 0.0
    change: float = 0.0
    change_pct: float = 0.0
    volume: int = 0
    market_cap_mn: float = 0.0        # PKR millions
    pe_ratio: float | None = None
    eps: float | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source_url: str = ""

    @model_validator(mode="after")
    def _compute_change(self) -> "StockQuote":
        if self.prev_close and self.prev_close > 0 and self.change == 0:
            self.change = self.current_price - self.prev_close
            self.change_pct = (self.change / self.prev_close) * 100
        return self


class MarketSnapshot(BaseModel):
    """Aggregated PSX market state at a point in time."""
    kse100_index: float = 0.0
    kse100_change: float = 0.0
    kse100_change_pct: float = 0.0
    kse30_index: float = 0.0
    total_volume: int = 0
    total_value_mn: float = 0.0       # PKR millions
    advances: int = 0
    declines: int = 0
    unchanged: int = 0
    quotes: list[StockQuote] = []
    scraped_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# News & Signals
# ─────────────────────────────────────────────────────────────────────────────

class NewsArticle(BaseModel):
    """A single scraped news article."""
    title: str
    url: str
    source: SignalSource
    published_at: datetime | None = None
    summary: str = ""
    full_text: str = ""
    tickers_mentioned: list[str] = []
    scraped_at: datetime = Field(default_factory=datetime.utcnow)


class Signal(BaseModel):
    """An extracted investment signal for a specific ticker."""
    ticker: str
    direction: SignalDirection
    source: SignalSource
    confidence: float = Field(..., ge=0.0, le=1.0)
    rationale: str = ""
    article_url: str = ""
    extracted_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = {}


class ConflictReport(BaseModel):
    """Describes a detected contradiction between signals for the same ticker."""
    ticker: str
    conflicting_signals: list[Signal]
    conflict_type: str       # e.g. "bullish_vs_bearish", "volume_price_divergence"
    severity: float = Field(..., ge=0.0, le=1.0)
    resolution: SignalDirection | None = None
    resolution_rationale: str = ""
    resolved_at: datetime | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Portfolio
# ─────────────────────────────────────────────────────────────────────────────

class PortfolioPosition(BaseModel):
    """A single position within the constructed portfolio."""
    ticker: str
    company_name: str = ""
    sector: str = ""
    allocation_pct: float           # 0–100
    capital_pkr: float
    shares: int = 0
    entry_price: float = 0.0
    stop_loss: float | None = None
    target_price: float | None = None
    risk_level: RiskLevel = RiskLevel.MEDIUM
    supporting_signals: list[Signal] = []
    justification: str = ""


class Portfolio(BaseModel):
    """The complete constructed portfolio with metadata."""
    id: str = ""
    total_capital_pkr: float
    positions: list[PortfolioPosition] = []
    cash_pct: float = 0.0
    expected_return_pct: float | None = None
    sharpe_ratio: float | None = None
    overall_risk: RiskLevel = RiskLevel.MEDIUM
    construction_rationale: str = ""
    conflicts_resolved: list[ConflictReport] = []
    constructed_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def invested_pct(self) -> float:
        return sum(p.allocation_pct for p in self.positions)


# ─────────────────────────────────────────────────────────────────────────────
# Action Chain
# ─────────────────────────────────────────────────────────────────────────────

class ActionStep(BaseModel):
    """One step in the agent's action chain."""
    step_number: int
    action_type: ActionType
    status: ActionStatus = ActionStatus.PENDING
    input_state: dict[str, Any] = {}
    output_state: dict[str, Any] = {}
    duration_ms: float | None = None
    error: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class AgentRun(BaseModel):
    """Full lifecycle of a single agent invocation."""
    run_id: str
    status: ActionStatus = ActionStatus.PENDING
    steps: list[ActionStep] = []
    portfolio: Portfolio | None = None
    market_snapshot: MarketSnapshot | None = None
    news_articles: list[NewsArticle] = []
    signals: list[Signal] = []
    conflict_reports: list[ConflictReport] = []
    gemini_reasoning: str = ""
    total_duration_ms: float | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None


# ─────────────────────────────────────────────────────────────────────────────
# API request / response wrappers
# ─────────────────────────────────────────────────────────────────────────────

class RunPortfolioRequest(BaseModel):
    capital_pkr: float = Field(1_000_000.0, gt=0)
    max_positions: int = Field(10, ge=1, le=30)
    risk_preference: RiskLevel = RiskLevel.MEDIUM
    tickers_filter: list[str] = []    # empty = consider all


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    environment: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
