"""
Action Chain Orchestrator
=========================
Drives the full 5-step agent pipeline with explicit state transitions,
timing, and error handling.  Each step records its input/output state
snapshot so the full run is auditable end-to-end.

Steps
-----
1. SCRAPE_MARKET_DATA   — Fetch PSX quotes & index.
2. SCRAPE_NEWS          — Fetch news from Dawn / ARY / Geo.
3. EXTRACT_SIGNALS      — Market + news → typed Signal objects.
4. RESOLVE_CONFLICTS    — Detect contradictions, apply resolutions.
5. CONSTRUCT_PORTFOLIO  — Gemini reasoning + PortfolioBuilder.
"""

from __future__ import annotations

import time
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any

from app.agent.gemini_agent import GeminiAgent
from app.config import get_settings
from app.logger import get_logger
from app.models import (
    ActionStatus,
    ActionStep,
    ActionType,
    AgentRun,
    ConflictReport,
    MarketSnapshot,
    NewsArticle,
    Portfolio,
    RiskLevel,
    Signal,
)
from app.portfolio.builder import PortfolioBuilder
from app.scrapers.news_scraper import NewsScraper
from app.scrapers.psx_scraper import PSXScraper
from app.signals.detector import ContradictionDetector
from app.signals.extractor import SignalExtractor

logger = get_logger(__name__)


class ActionChain:
    """
    Orchestrates the full pipeline and returns a completed AgentRun.

    Usage::

        chain = ActionChain()
        run = await chain.execute(
            capital_pkr=1_000_000,
            max_positions=10,
            risk_preference=RiskLevel.MEDIUM,
        )
    """

    def __init__(self) -> None:
        self._cfg = get_settings()
        self._extractor = SignalExtractor()
        self._detector = ContradictionDetector()
        self._builder = PortfolioBuilder()
        self._gemini = GeminiAgent()

    async def execute(
        self,
        capital_pkr: float | None = None,
        max_positions: int | None = None,
        risk_preference: RiskLevel = RiskLevel.MEDIUM,
        tickers_filter: list[str] | None = None,
    ) -> AgentRun:
        cfg = self._cfg
        capital_pkr = capital_pkr or cfg.portfolio_capital_pkr
        max_positions = max_positions or cfg.portfolio_max_positions

        run = AgentRun(
            run_id=str(uuid.uuid4()),
            status=ActionStatus.IN_PROGRESS,
            created_at=datetime.now(tz=timezone.utc),
        )

        logger.info("action_chain.start", run_id=run.run_id, capital=capital_pkr)
        run_start = time.perf_counter()

        # ── Step 1: Scrape market data ─────────────────────────────────────────
        step1 = self._make_step(1, ActionType.SCRAPE_MARKET_DATA)
        run.steps.append(step1)
        snapshot = await self._run_step(
            step1,
            self._step_scrape_market,
            input_state={"psx_url": cfg.psx_base_url},
        )
        if snapshot is None:
            snapshot = MarketSnapshot()
        run.market_snapshot = snapshot

        # ── Step 2: Scrape news ────────────────────────────────────────────────
        step2 = self._make_step(2, ActionType.SCRAPE_NEWS)
        run.steps.append(step2)
        articles = await self._run_step(
            step2,
            self._step_scrape_news,
            input_state={"sources": ["dawn", "ary", "geo"]},
        )
        if articles is None:
            articles = []
        run.news_articles = articles

        # ── Step 3: Extract signals ────────────────────────────────────────────
        step3 = self._make_step(3, ActionType.EXTRACT_SIGNALS)
        run.steps.append(step3)
        signals = await self._run_step(
            step3,
            self._step_extract_signals,
            input_state={
                "quote_count": len(snapshot.quotes),
                "article_count": len(articles),
                "tickers_filter": tickers_filter or [],
            },
            snapshot=snapshot,
            articles=articles,
            tickers_filter=tickers_filter,
        )
        if signals is None:
            signals = []
        run.signals = signals

        # ── Step 4: Detect & resolve conflicts ────────────────────────────────
        step4 = self._make_step(4, ActionType.RESOLVE_CONFLICTS)
        run.steps.append(step4)
        conflicts = await self._run_step(
            step4,
            self._step_resolve_conflicts,
            input_state={"signal_count": len(signals)},
            signals=signals,
        )
        if conflicts is None:
            conflicts = []
        run.conflict_reports = conflicts

        # ── Step 5: Construct portfolio ────────────────────────────────────────
        step5 = self._make_step(5, ActionType.CONSTRUCT_PORTFOLIO)
        run.steps.append(step5)
        portfolio = await self._run_step(
            step5,
            self._step_construct_portfolio,
            input_state={
                "capital_pkr": capital_pkr,
                "max_positions": max_positions,
                "risk_preference": risk_preference.value,
                "conflict_count": len(conflicts),
            },
            snapshot=snapshot,
            articles=articles,
            signals=signals,
            conflicts=conflicts,
            capital_pkr=capital_pkr,
            max_positions=max_positions,
            risk_preference=risk_preference,
        )
        run.portfolio = portfolio

        # ── Finalise run ───────────────────────────────────────────────────────
        elapsed_ms = (time.perf_counter() - run_start) * 1000
        run.total_duration_ms = round(elapsed_ms, 1)
        run.completed_at = datetime.now(tz=timezone.utc)

        failed = any(s.status == ActionStatus.FAILED for s in run.steps)
        run.status = ActionStatus.FAILED if (failed and portfolio is None) else ActionStatus.COMPLETED

        logger.info(
            "action_chain.done",
            run_id=run.run_id,
            status=run.status.value,
            duration_ms=run.total_duration_ms,
            positions=len(run.portfolio.positions) if run.portfolio else 0,
        )
        return run

    # ── Step implementations ───────────────────────────────────────────────────

    async def _step_scrape_market(self, **_: Any) -> MarketSnapshot:
        async with PSXScraper() as scraper:
            return await scraper.scrape()

    async def _step_scrape_news(self, **_: Any) -> list[NewsArticle]:
        async with NewsScraper() as scraper:
            return await scraper.scrape()

    async def _step_extract_signals(
        self,
        snapshot: MarketSnapshot,
        articles: list[NewsArticle],
        tickers_filter: list[str] | None,
        **_: Any,
    ) -> list[Signal]:
        market_sigs = self._extractor.extract_market_signals(snapshot)
        news_sigs = self._extractor.extract_news_signals(articles)
        all_signals = market_sigs + news_sigs

        if tickers_filter:
            tf = set(t.upper() for t in tickers_filter)
            all_signals = [s for s in all_signals if s.ticker in tf]

        return all_signals

    async def _step_resolve_conflicts(
        self, signals: list[Signal], **_: Any
    ) -> list[ConflictReport]:
        grouped = self._extractor.aggregate(signals, [])
        return self._detector.detect(grouped)

    async def _step_construct_portfolio(
        self,
        snapshot: MarketSnapshot,
        articles: list[NewsArticle],
        signals: list[Signal],
        conflicts: list[ConflictReport],
        capital_pkr: float,
        max_positions: int,
        risk_preference: RiskLevel,
        **_: Any,
    ) -> Portfolio:
        gemini_output = await self._gemini.reason(
            signals=signals,
            conflicts=conflicts,
            snapshot=snapshot,
            articles=articles,
            capital_pkr=capital_pkr,
            risk_preference=risk_preference,
            max_positions=max_positions,
        )
        return self._builder.build(
            gemini_output=gemini_output,
            capital_pkr=capital_pkr,
            quotes=snapshot.quotes,
            all_signals=signals,
            conflicts=conflicts,
        )

    # ── Orchestration helpers ──────────────────────────────────────────────────

    @staticmethod
    def _make_step(number: int, action_type: ActionType) -> ActionStep:
        return ActionStep(
            step_number=number,
            action_type=action_type,
            status=ActionStatus.PENDING,
        )

    async def _run_step(
        self,
        step: ActionStep,
        fn: Any,
        input_state: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> Any:
        """Execute a step function, record timing and state, handle errors."""
        step.input_state = input_state or {}
        step.status = ActionStatus.IN_PROGRESS
        step.started_at = datetime.now(tz=timezone.utc)
        t0 = time.perf_counter()

        logger.info(
            "action_chain.step_start",
            step=step.step_number,
            action=step.action_type.value,
        )

        try:
            result = await fn(**kwargs)
            step.status = ActionStatus.COMPLETED
            step.output_state = self._summarise_output(result)
            return result
        except Exception as exc:
            step.status = ActionStatus.FAILED
            step.error = str(exc)
            step.output_state = {"error": str(exc), "traceback": traceback.format_exc()[-500:]}
            logger.error(
                "action_chain.step_failed",
                step=step.step_number,
                action=step.action_type.value,
                error=str(exc),
            )
            return None
        finally:
            step.duration_ms = round((time.perf_counter() - t0) * 1000, 1)
            step.completed_at = datetime.now(tz=timezone.utc)
            logger.info(
                "action_chain.step_done",
                step=step.step_number,
                status=step.status.value,
                duration_ms=step.duration_ms,
            )

    @staticmethod
    def _summarise_output(result: Any) -> dict[str, Any]:
        """Produce a JSON-serialisable summary of a step's output."""
        if result is None:
            return {}
        if isinstance(result, list):
            return {"count": len(result), "type": type(result[0]).__name__ if result else "empty"}
        if hasattr(result, "model_dump"):
            # Pydantic model — return a lightweight summary
            d = result.model_dump(exclude={"quotes", "full_text"})
            return {k: v for k, v in d.items() if v is not None}
        return {"value": str(result)[:200]}
