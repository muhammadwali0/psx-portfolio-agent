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

import asyncio
import time
import traceback
import uuid
from datetime import UTC, datetime
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
    InvestmentMode,
    MarketSnapshot,
    NewsArticle,
    Portfolio,
    RiskLevel,
    Signal,
)
from app.portfolio.builder import PortfolioBuilder
from app.data.store import MarketDataStore
from app.scrapers.psx_scraper import PSXScraper
from app.services.shariah import ShariahFilter
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
        investment_mode: InvestmentMode = InvestmentMode.FUNDAMENTAL,
        shariah_mode: bool = False,
        tickers_filter: list[str] | None = None,
        run_id: str | None = None,
    ) -> AgentRun:
        cfg = self._cfg
        capital_pkr = capital_pkr or cfg.portfolio_capital_pkr
        max_positions = max_positions or cfg.portfolio_max_positions

        run = AgentRun(
            run_id=run_id or str(uuid.uuid4()),
            status=ActionStatus.IN_PROGRESS,
            created_at=datetime.now(tz=UTC),
        )

        logger.info(
            "action_chain.start",
            run_id=run.run_id,
            capital=capital_pkr,
            investment_mode=investment_mode.value,
            shariah_mode=shariah_mode,
        )
        run_start = time.perf_counter()

        from app.progress import ProgressManager
        pm = ProgressManager.get_instance()
        await pm.publish(run.run_id, "Fetching market data...")

        # ── Step 1 & 2: Scrape concurrently ────────────────────────────────────
        step1 = self._make_step(1, ActionType.SCRAPE_MARKET_DATA)
        step2 = self._make_step(2, ActionType.SCRAPE_NEWS)
        run.steps.append(step1)
        run.steps.append(step2)

        snapshot, articles = await asyncio.gather(
            self._run_step(
                step1,
                self._step_scrape_market,
                input_state={"psx_url": cfg.psx_base_url},
            ),
            self._run_step(
                step2,
                self._step_scrape_news,
                input_state={"sources": ["dawn", "ary", "geo"]},
            ),
        )

        if snapshot is None:
            snapshot = MarketSnapshot()
        run.market_snapshot = snapshot

        if articles is None:
            articles = []
        run.news_articles = articles

        # ── Step 3: Extract signals ────────────────────────────────────────────
        await pm.publish(run.run_id, "Analyzing signals...")
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
            shariah_mode=shariah_mode,
        )
        if signals is None:
            signals = []
        run.signals = signals

        # ── Step 4: Detect & resolve conflicts ────────────────────────────────
        await pm.publish(run.run_id, "Resolving contradictions...")
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
        await pm.publish(run.run_id, "Building portfolio...")
        step5 = self._make_step(5, ActionType.CONSTRUCT_PORTFOLIO)
        run.steps.append(step5)

        # Pre-filter before Gemini reasoning
        top_signals = sorted(signals, key=lambda s: s.confidence, reverse=True)[:20]
        recent_articles = sorted(
            articles,
            key=lambda a: a.published_at or a.scraped_at,
            reverse=True
        )[:10]

        portfolio = await self._run_step(
            step5,
            self._step_construct_portfolio,
            input_state={
                "capital_pkr": capital_pkr,
                "max_positions": max_positions,
                "risk_preference": risk_preference.value,
                "investment_mode": investment_mode.value,
                "shariah_mode": shariah_mode,
                "conflict_count": len(conflicts),
                "filtering": {
                    "original_signals": len(signals),
                    "filtered_signals": len(top_signals),
                    "original_articles": len(articles),
                    "filtered_articles": len(recent_articles),
                }
            },
            snapshot=snapshot,
            articles=recent_articles,
            signals=top_signals,
            all_signals=signals,
            conflicts=conflicts,
            capital_pkr=capital_pkr,
            max_positions=max_positions,
            risk_preference=risk_preference,
            investment_mode=investment_mode,
            shariah_mode=shariah_mode,
        )
        run.portfolio = portfolio

        # ── Finalise run ───────────────────────────────────────────────────────
        elapsed_ms = (time.perf_counter() - run_start) * 1000
        run.total_duration_ms = round(elapsed_ms, 1)
        run.completed_at = datetime.now(tz=UTC)

        failed = any(s.status == ActionStatus.FAILED for s in run.steps)
        run.status = ActionStatus.FAILED if (failed and portfolio is None) else ActionStatus.COMPLETED

        logger.info(
            "action_chain.done",
            run_id=run.run_id,
            status=run.status.value,
            duration_ms=run.total_duration_ms,
            positions=len(run.portfolio.positions) if run.portfolio else 0,
        )
        if run.status == ActionStatus.COMPLETED:
            await pm.publish(run.run_id, "COMPLETE")
        else:
            await pm.publish(run.run_id, "FAILED: Portfolio generation failed")
        return run

    # ── Step implementations ───────────────────────────────────────────────────

    async def _step_scrape_market(self, **_: Any) -> MarketSnapshot:
        store = MarketDataStore.get_instance()
        store.require_ready()
        return await PSXScraper().scrape()

    async def _step_scrape_news(self, **_: Any) -> list[NewsArticle]:
        store = MarketDataStore.get_instance()
        articles = store.get_news_articles()
        if articles is not None:
            return articles
        store.require_ready()
        return store.get_news_articles() or []

    async def _step_extract_signals(
        self,
        snapshot: MarketSnapshot,
        articles: list[NewsArticle],
        tickers_filter: list[str] | None,
        shariah_mode: bool = False,
        **_: Any,
    ) -> list[Signal]:
        market_sigs = self._extractor.extract_market_signals(snapshot)
        news_sigs = self._extractor.extract_news_signals(articles)
        all_signals = market_sigs + news_sigs

        if shariah_mode:
            shariah = ShariahFilter()
            gis_syms = ShariahFilter.gis_symbol_set(snapshot)
            all_signals = [
                s
                for s in all_signals
                if shariah.is_compliant_equity(s.ticker)
                or ShariahFilter.is_gis_sukuk(s.ticker, gis_syms)
            ]

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
        all_signals: list[Signal],
        conflicts: list[ConflictReport],
        capital_pkr: float,
        max_positions: int,
        risk_preference: RiskLevel,
        investment_mode: InvestmentMode,
        shariah_mode: bool = False,
        **_: Any,
    ) -> Portfolio:
        shariah = ShariahFilter() if shariah_mode else None
        if shariah_mode and shariah:
            allowed = set(shariah.allowed_tickers_for_prompt(snapshot))
            signals = [s for s in signals if s.ticker.upper() in allowed]

        gemini_output = await self._gemini.reason(
            signals=signals,
            conflicts=conflicts,
            snapshot=snapshot,
            articles=articles,
            capital_pkr=capital_pkr,
            risk_preference=risk_preference,
            max_positions=max_positions,
            investment_mode=investment_mode,
            shariah_mode=shariah_mode,
        )
        store = MarketDataStore.get_instance()
        aggregates = store.get_aggregates()
        rf = store.get_risk_free_rate()
        if shariah_mode and aggregates and aggregates.gis_benchmark_rate:
            rf = round(aggregates.gis_benchmark_rate / 100, 4)
        elif shariah_mode and aggregates:
            rf = aggregates.risk_free_rate

        return self._builder.build(
            gemini_output=gemini_output,
            capital_pkr=capital_pkr,
            quotes=snapshot.quotes,
            all_signals=all_signals,
            conflicts=conflicts,
            investment_mode=investment_mode,
            aggregates=aggregates,
            risk_free_rate=rf,
            shariah_mode=shariah_mode,
            snapshot=snapshot,
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
        step.started_at = datetime.now(tz=UTC)
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
            step.completed_at = datetime.now(tz=UTC)
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
