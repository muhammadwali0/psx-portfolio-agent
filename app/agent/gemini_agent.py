"""
Gemini Reasoning Agent
======================
Uses Google Gemini (gemini-3-flash-preview) to perform deep reasoning over
extracted signals and conflict reports, then produce:
  1. A structured portfolio allocation JSON.
  2. A human-readable investment thesis.

The agent is prompted with structured context and responds with a
strict JSON schema that the portfolio builder can parse directly.
"""

from __future__ import annotations

import hashlib
import json
import re
import textwrap
from collections.abc import Sequence
from typing import Any

import diskcache
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from app.config import get_settings
from app.logger import get_logger
from app.data.store import MarketDataStore
from app.models import (
    ConflictReport,
    InvestmentMode,
    MarketSnapshot,
    NewsArticle,
    PrecomputedAggregates,
    RiskLevel,
    Signal,
    SignalDirection,
)

from app.services.shariah import ShariahFilter

logger = get_logger(__name__)

_cache = diskcache.Cache("data/gemini_cache")



# ─── Schema the model must return ─────────────────────────────────────────────

_TACTICAL_PORTFOLIO_JSON_SCHEMA = """{
  "reasoning_summary": "<string: 2-3 paragraph investment thesis>",
  "macro_outlook": "<string: brief near-term PKR/rates/liquidity context>",
  "risk_assessment": "<low|medium|high>",
  "positions": [
    {
      "ticker": "<PSX symbol>",
      "allocation_pct": <float 0-100>,
      "direction": "<bullish|bearish|neutral>",
      "entry_rationale": "<string: momentum, volume, and catalyst evidence>",
      "hold_duration_days": <integer, e.g. 5>,
      "thesis_invalidation_conditions": ["<condition1>", "<condition2>"],
      "stop_loss_pct": <float, e.g. 7.0>,
      "target_return_pct": <float, e.g. 12.0>,
      "risk_level": "<low|medium|high>",
      "key_risks": ["<risk1>", "<risk2>"]
    }
  ],
  "cash_allocation_pct": <float>,
  "expected_portfolio_return_pct": <float>,
  "conflicts_addressed": [
    {
      "ticker": "<symbol>",
      "conflict_type": "<type>",
      "how_resolved": "<string>"
    }
  ]
}"""


_FUNDAMENTAL_PORTFOLIO_JSON_SCHEMA = """{
  "reasoning_summary": "<string: 2-3 paragraph investment thesis>",
  "macro_outlook": "<string: brief PKR/rates/macro context>",
  "risk_assessment": "<low|medium|high>",
  "positions": [
    {
      "ticker": "<PSX symbol>",
      "allocation_pct": <float 0-100>,
      "direction": "<bullish|bearish|neutral>",
      "entry_rationale": "<string: valuation, sector, earnings, and trend evidence>",
      "sector_outlook": "<string>",
      "range_52w_position": "<string: low|mid|high range or descriptive positioning>",
      "ytd_trend": "<string: positive|negative|flat or descriptive trend>",
      "rebalancing_triggers": ["<trigger1>", "<trigger2>"],
      "target_return_pct": <float, e.g. 12.0>,
      "risk_level": "<low|medium|high>",
      "key_risks": ["<risk1>", "<risk2>"]
    }
  ],
  "cash_allocation_pct": <float>,
  "expected_portfolio_return_pct": <float>,
  "conflicts_addressed": [
    {
      "ticker": "<symbol>",
      "conflict_type": "<type>",
      "how_resolved": "<string>"
    }
  ]
}"""


_SHARIAH_POSITION_EXTRA = """
      "instrument_type": "<equity|gis_sukuk>",
      "shariah_compliant": true,"""


def _fmt_shariah_context(snapshot: MarketSnapshot) -> str:
    shariah = ShariahFilter()
    universe = sorted(shariah.get_universe())
    gis = ShariahFilter.gis_instruments(snapshot)
    gis_lines = [
        f"  • {g.symbol}: PKR {g.current_price:.2f} yield={g.yield_pct:.2f}%"
        for g in gis[:20]
    ]
    return textwrap.dedent(f"""
        ### Shariah Compliance Mode (ACTIVE)
        - Equity candidates MUST be from KMI30 / PSX-KMI-ALL-Shares only ({len(universe)} symbols).
        - Do NOT allocate to conventional bonds, MTS board, futures (-MAY/-JUN), or leveraged products.
        - Replace any fixed-income / cash sleeve with GIS Government Ijarah Sukuk from the list below.
        - Set instrument_type to "equity" for KMI stocks or "gis_sukuk" for Sukuk positions.
        - Set shariah_compliant: true on EVERY position.

        Allowed equity symbols (sample): {", ".join(universe[:40])}{"..." if len(universe) > 40 else ""}

        Available GIS Sukuk (fixed-income alternative):
        {chr(10).join(gis_lines) if gis_lines else "  (none in snapshot)"}
    """).strip()


def _fmt_signals(signals: Sequence[Signal]) -> str:
    rows = []
    for s in signals[:40]:  # cap context length
        rows.append(
            f"  • {s.ticker:8s} | {s.direction.value:8s} | conf={s.confidence:.2f}"
            f" | src={s.source.value} | {s.rationale[:80]}"
        )
    return "\n".join(rows) if rows else "  (none)"


def _fmt_conflicts(reports: Sequence[ConflictReport]) -> str:
    rows = []
    for r in reports:
        rows.append(
            f"  • {r.ticker}: {r.conflict_type} (severity={r.severity:.2f}) "
            f"→ resolved={r.resolution.value if r.resolution else 'unresolved'}"
        )
    return "\n".join(rows) if rows else "  (none)"


def _fmt_precomputed(agg: PrecomputedAggregates) -> str:
    lines = [
        f"Risk-free rate (GIS/SBP benchmark): {agg.risk_free_rate * 100:.2f}%",
        f"Index breadth — advances: {agg.index_breadth.advances}, "
        f"declines: {agg.index_breadth.declines}, unchanged: {agg.index_breadth.unchanged}",
    ]
    if agg.sector_performance:
        lines.append("Sector average YTD % (from SQLite OHLCV):")
        for s in agg.sector_performance[:12]:
            lines.append(f"  • {s.sector}: {s.avg_ytd_pct:+.1f}% ({s.symbol_count} stocks)")
    if agg.top_movers_by_change_pct:
        lines.append("Top movers by % change:")
        for m in agg.top_movers_by_change_pct[:10]:
            lines.append(f"  • {m.symbol}: {m.change_pct:+.2f}% vol={m.volume:,}")
    if agg.futures_oi_leaders:
        lines.append("Futures open-interest leaders:")
        for f in agg.futures_oi_leaders[:8]:
            lines.append(f"  • {f.symbol}: OI={f.open_interest:,}")
    return "\n".join(lines)


def _fmt_symbol_technicals(agg: PrecomputedAggregates, symbols: list[str]) -> str:
    lines = ["Technical context (SQLite pre-computed at bootstrap):"]
    for sym in symbols[:25]:
        ctx = agg.moving_averages.get(sym.upper())
        if not ctx:
            continue
        pos = ctx.position_in_90d_range_pct
        pos_txt = f"{pos:.0f}% of 90d range" if pos is not None else "n/a"
        lines.append(
            f"  • {sym}: MA20={ctx.ma20} MA50={ctx.ma50} MA200={ctx.ma200} | {pos_txt} | "
            f"90d hi={ctx.range_90d_high} lo={ctx.range_90d_low}"
        )
    return "\n".join(lines) if len(lines) > 1 else ""


def _fmt_market(snapshot: MarketSnapshot) -> str:
    board = snapshot.board_stats
    advances = board.advances if board else snapshot.advances
    declines = board.declines if board else snapshot.declines
    unchanged = board.unchanged if board else snapshot.unchanged
    total_volume = board.total_volume if board else snapshot.total_volume
    total_value = board.total_value_mn if board else snapshot.total_value_mn
    futures_volume = sum(contract.volume for contract in snapshot.futures)
    lines = [
        f"KSE-100: {snapshot.kse100_index:,.0f} ({snapshot.kse100_change_pct:+.2f}%) | "
        f"Advances: {advances} | Declines: {declines} | Unchanged: {unchanged} | "
        f"Board volume: {total_volume:,} | Board value: PKR {total_value:,.2f} mn | "
        f"Futures contracts: {len(snapshot.futures)} | Futures volume: {futures_volume:,}",
    ]
    hist = snapshot.historical
    if hist and hist.by_symbol:
        lines.append(
            f"Historical DB as of {hist.as_of_date} — "
            f"{len(hist.by_symbol)} symbols with MA/90d range context."
        )
        for sym, ctx in list(hist.by_symbol.items())[:8]:
            pos = ctx.position_in_90d_range_pct
            pos_txt = f"{pos:.0f}% of 90d range" if pos is not None else "n/a"
            lines.append(
                f"  • {sym}: MA20={ctx.ma20} MA50={ctx.ma50} MA200={ctx.ma200} | {pos_txt}"
            )
        if hist.index_constituent_changes:
            lines.append(
                f"  KSE-100 constituent changes: {len(hist.index_constituent_changes)}"
            )
    return "\n".join(lines)


def _fmt_news(articles: Sequence[NewsArticle]) -> str:
    lines = []
    for a in articles[:15]:
        tickers = ", ".join(a.tickers_mentioned) or "general"
        lines.append(f"  • [{a.source.value}] {a.title[:100]} (tickers: {tickers})")
    return "\n".join(lines) if lines else "  (none)"


# ─────────────────────────────────────────────────────────────────────────────


class GeminiAgent:
    """
    Wraps the Gemini generative model with structured prompting for
    portfolio construction reasoning.

    Usage::

        agent = GeminiAgent()
        result = await agent.reason(
            signals=signals,
            conflicts=conflicts,
            snapshot=snapshot,
            articles=articles,
            capital_pkr=1_000_000,
            risk_preference=RiskLevel.MEDIUM,
            max_positions=10,
        )
    """

    def __init__(self) -> None:
        cfg = get_settings()
        genai.configure(api_key=cfg.google_api_key)
        self._model = genai.GenerativeModel(
            model_name=cfg.gemini_model,
            generation_config=GenerationConfig(
                temperature=cfg.gemini_temperature,
                max_output_tokens=cfg.gemini_max_output_tokens,
                response_mime_type="application/json",
            ),
            system_instruction=self._system_prompt(InvestmentMode.FUNDAMENTAL),
        )
        self._cfg = cfg

    # ── Public interface ───────────────────────────────────────────────────────

    async def reason(
        self,
        signals: list[Signal],
        conflicts: list[ConflictReport],
        snapshot: MarketSnapshot,
        articles: list[NewsArticle],
        capital_pkr: float,
        risk_preference: RiskLevel,
        max_positions: int,
        investment_mode: InvestmentMode = InvestmentMode.FUNDAMENTAL,
        shariah_mode: bool = False,
    ) -> dict[str, Any]:
        """
        Send a structured prompt to Gemini and return the parsed JSON response.

        Returns a dict matching ``_PORTFOLIO_JSON_SCHEMA``.
        Raises ValueError if the model response cannot be parsed as JSON.
        """
        key_parts = (
            f"{len(signals)}-{len(conflicts)}-{capital_pkr:.0f}"
            f"-{risk_preference.value}-{max_positions}-{investment_mode.value}-shariah={shariah_mode}"
        )
        cache_key = hashlib.md5(key_parts.encode()).hexdigest()
        if cache_key in _cache:
            logger.info("gemini_agent.cache_hit", key=cache_key)
            return _cache[cache_key]

        store = MarketDataStore.get_instance()
        aggregates = store.get_aggregates()

        prompt = self._build_prompt(
            signals=signals,
            conflicts=conflicts,
            snapshot=snapshot,
            articles=articles,
            capital_pkr=capital_pkr,
            risk_preference=risk_preference,
            max_positions=max_positions,
            investment_mode=investment_mode,
            aggregates=aggregates,
            risk_free_rate=store.get_risk_free_rate(),
            shariah_mode=shariah_mode,
        )

        logger.info(
            "gemini_agent.reasoning_start",
            model=self._cfg.gemini_model,
            mode=investment_mode.value,
        )

        try:
            model = self._model_for_mode(investment_mode)
            response = await model.generate_content_async(prompt)
            raw = response.text.strip()
            logger.debug("gemini_agent.raw_response", length=len(raw))
        except Exception as exc:
            logger.error("gemini_agent.api_error", error=str(exc))
            raise

        # Parse JSON — model is instructed to return only JSON
        try:
            result: dict[str, Any] = json.loads(raw)
        except json.JSONDecodeError as exc:
            # Attempt to extract JSON block if wrapped in markdown
            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
            if match:
                result = json.loads(match.group(1))
            else:
                logger.error("gemini_agent.json_parse_failed", raw=raw[:500])
                raise ValueError(f"Gemini returned non-JSON output: {raw[:200]}") from exc

        logger.info(
            "gemini_agent.reasoning_done",
            positions=len(result.get("positions", [])),
            risk=result.get("risk_assessment"),
        )
        _cache.set(cache_key, result, expire=300)
        return result

    async def explain_conflict(self, conflict: ConflictReport) -> str:
        """Ask Gemini to explain a single conflict in plain English."""
        prompt = textwrap.dedent(f"""
            Explain this investment signal conflict for {conflict.ticker} to a retail investor
            in 2-3 concise sentences. Conflict type: {conflict.conflict_type}.
            Severity: {conflict.severity:.2f}.
            Signals involved: {[s.rationale for s in conflict.conflicting_signals]}.
            Resolution: {conflict.resolution_rationale}.
            Keep it jargon-free.
        """)
        try:
            model = genai.GenerativeModel("gemini-3-flash-preview")
            resp = await model.generate_content_async(prompt)
            return resp.text.strip()
        except Exception as exc:
            logger.warning("gemini_agent.explain_conflict_failed", error=str(exc))
            return conflict.resolution_rationale

    # ── Prompt builders ────────────────────────────────────────────────────────

    @staticmethod
    def _system_prompt(mode: InvestmentMode) -> str:
        common = """
            You are an expert Pakistani equity analyst and portfolio manager with 20 years of
            experience on the Karachi Stock Exchange / PSX. You reason in structured JSON.

            RULES:
            1. Always return ONLY valid JSON matching the schema provided — no markdown, no prose.
            2. Allocations must sum to 100 (positions + cash_allocation_pct).
            3. Respect the max_positions constraint strictly.
            4. Never recommend a single stock > 20% allocation unless explicitly allowed.
            5. Justify every position with concrete signal evidence.
            6. Acknowledge every conflict and explain how you resolved it.
            7. Consider Pakistan-specific macro factors: SBP rate, PKR/USD, CPEC, IMF programme.
        """
        tactical = """
            MODE: TACTICAL.
            Focus on short-horizon momentum, breadth, liquidity, price confirmation, board volume,
            and near-term catalysts. Prefer shorter holding periods. Provide stop_loss_pct and
            target_return_pct for every position, plus thesis_invalidation_conditions for
            catalyst or momentum failure.
        """
        fundamental = """
            MODE: FUNDAMENTAL.
            Focus on sector outlook, valuation quality, earnings durability, balance-sheet risk,
            dividend/cash-flow support, 52-week range positioning, YTD trend, and rebalancing
            triggers. Do not return stop_loss_pct, stop_loss, target_price, or other numeric
            exit prices; use rebalancing_triggers only. Avoid purely short-term price-chasing
            unless fundamentals also support it.
        """
        mode_prompt = tactical if mode == InvestmentMode.TACTICAL else fundamental
        return textwrap.dedent(common + mode_prompt).strip()

    def _model_for_mode(self, mode: InvestmentMode) -> genai.GenerativeModel:
        return genai.GenerativeModel(
            model_name=self._cfg.gemini_model,
            generation_config=GenerationConfig(
                temperature=self._cfg.gemini_temperature,
                max_output_tokens=self._cfg.gemini_max_output_tokens,
                response_mime_type="application/json",
            ),
            system_instruction=self._system_prompt(mode),
        )


    def _build_prompt(
        self,
        signals: list[Signal],
        conflicts: list[ConflictReport],
        snapshot: MarketSnapshot,
        articles: list[NewsArticle],
        capital_pkr: float,
        risk_preference: RiskLevel,
        max_positions: int,
        investment_mode: InvestmentMode = InvestmentMode.FUNDAMENTAL,
        aggregates: PrecomputedAggregates | None = None,
        risk_free_rate: float = 0.21,
        shariah_mode: bool = False,
    ) -> str:
        bull = [s for s in signals if s.direction == SignalDirection.BULLISH]
        bear = [s for s in signals if s.direction == SignalDirection.BEARISH]

        if investment_mode == InvestmentMode.TACTICAL:
            schema = _TACTICAL_PORTFOLIO_JSON_SCHEMA
            instructions = [
                f"1. Select up to {max_positions} stocks from bullish momentum signals.",
                "2. Prioritize recent price strength, high relative board volume, breadth confirmation, and actionable catalysts.",
                "3. Use short hold_duration_days values, generally 2-20 trading days.",
                "4. Provide stop_loss_pct, target_return_pct, and thesis_invalidation_conditions for every position.",
                "5. Address every detected conflict in conflicts_addressed.",
                "6. Set cash_allocation_pct to reflect liquidity and breadth risk.",
            ]
        else:
            schema = _FUNDAMENTAL_PORTFOLIO_JSON_SCHEMA
            instructions = [
                f"1. Select up to {max_positions} stocks with durable fundamental support.",
                "2. Weigh sector outlook, 52-week range positioning, YTD trend, earnings quality, and valuation risk.",
                "3. Provide sector_outlook, range_52w_position, ytd_trend, and rebalancing_triggers for every position.",
                "4. Do not return stop_loss_pct, stop_loss, target_price, or numeric exit prices; use rebalancing_triggers only.",
                "5. Address every detected conflict in conflicts_addressed.",
                "6. Set cash_allocation_pct to reflect macro and valuation uncertainty.",
            ]

        if capital_pkr > 500000 and max_positions >= 5:
            div_n = len(instructions) + 1
            instructions.append(
                f"{div_n}. DIVERSIFICATION INSTRUCTION: Spread positions across at least 3 different sectors, "
                "avoid allocating more than 40% to any single sector, and consider mid-confidence signals "
                "from underrepresented sectors over high-confidence signals from already-represented ones."
            )

        if shariah_mode:
            schema = schema.replace(
                '"risk_level": "<low|medium|high>"',
                '"risk_level": "<low|medium|high>"' + _SHARIAH_POSITION_EXTRA,
                1,
            )
            instructions.insert(
                0,
                "SHARIAH MODE: Restrict equity picks to the KMI Shariah universe only; "
                "use GIS Sukuk for fixed-income allocation instead of cash or conventional bonds; "
                "exclude MTS/leveraged/futures instruments.",
            )
            instructions.append(
                "Set instrument_type and shariah_compliant on every position. "
                "Allocate 5-20% to GIS Sukuk symbols for the fixed-income sleeve if appropriate."
            )

        instructions_text = "\n".join(instructions)

        precomputed_block = ""
        technicals_block = ""
        shariah_block = _fmt_shariah_context(snapshot) if shariah_mode else ""
        if aggregates:
            precomputed_block = f"\n### Pre-computed Market Analytics (Redis/SQLite)\n{_fmt_precomputed(aggregates)}\n"
            signal_symbols = list({s.ticker for s in signals})
            technicals_block = _fmt_symbol_technicals(aggregates, signal_symbols)

        return textwrap.dedent(f"""
            ## PSX Portfolio Construction Task

            ### Investor Parameters
            - Capital: PKR {capital_pkr:,.0f}
            - Risk preference: {risk_preference.value}
            - Investment mode: {investment_mode.value}
            - Max positions: {max_positions}
            - Max single stock: {self._cfg.portfolio_max_single_stock_pct * 100:.0f}%
            - Risk-free rate for Sharpe context: {risk_free_rate * 100:.2f}%
            - Shariah mode: {shariah_mode}

            ### Market Conditions
            {_fmt_market(snapshot)}
            {precomputed_block}
            {technicals_block}
            {shariah_block}

            ### Bullish Signals ({len(bull)})
            {_fmt_signals(bull)}

            ### Bearish Signals ({len(bear)})
            {_fmt_signals(bear)}

            ### Detected Signal Conflicts ({len(conflicts)})
            {_fmt_conflicts(conflicts)}

            ### Recent News Headlines
            {_fmt_news(articles)}

            ### Required Output Schema
            Return ONLY a JSON object matching this schema exactly:
            {schema}

            ### Instructions
            {instructions_text}
        """).strip()
