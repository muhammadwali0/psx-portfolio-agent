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

import json
import textwrap
from typing import Any, Sequence

import google.generativeai as genai
from google.generativeai.types import GenerationConfig

import hashlib
import diskcache

_cache = diskcache.Cache("/tmp/gemini_cache")

from app.config import get_settings
from app.logger import get_logger
from app.models import (
    ConflictReport,
    MarketSnapshot,
    NewsArticle,
    RiskLevel,
    Signal,
    SignalDirection,
)

logger = get_logger(__name__)


# ─── Schema the model must return ─────────────────────────────────────────────

_PORTFOLIO_JSON_SCHEMA = """{
  "reasoning_summary": "<string: 2-3 paragraph investment thesis>",
  "macro_outlook": "<string: brief PKR/rates/macro context>",
  "risk_assessment": "<low|medium|high>",
  "positions": [
    {
      "ticker": "<PSX symbol>",
      "allocation_pct": <float 0-100>,
      "direction": "<bullish|bearish|neutral>",
      "entry_rationale": "<string>",
      "stop_loss_pct": <float, e.g. 5.0>,
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


def _fmt_market(snapshot: MarketSnapshot) -> str:
    return (
        f"KSE-100: {snapshot.kse100_index:,.0f} ({snapshot.kse100_change_pct:+.2f}%) | "
        f"Advances: {snapshot.advances} | Declines: {snapshot.declines} | "
        f"Volume: {snapshot.total_volume:,}"
    )


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
            system_instruction=self._system_prompt(),
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
    ) -> dict[str, Any]:
        """
        Send a structured prompt to Gemini and return the parsed JSON response.

        Returns a dict matching ``_PORTFOLIO_JSON_SCHEMA``.
        Raises ValueError if the model response cannot be parsed as JSON.
        """
        key_parts = (
            f"{len(signals)}-{len(conflicts)}-{capital_pkr:.0f}"
            f"-{risk_preference.value}-{max_positions}"
        )
        cache_key = hashlib.md5(key_parts.encode()).hexdigest()
        if cache_key in _cache:
            logger.info("gemini_agent.cache_hit", key=cache_key)
            return _cache[cache_key]

        prompt = self._build_prompt(
            signals=signals,
            conflicts=conflicts,
            snapshot=snapshot,
            articles=articles,
            capital_pkr=capital_pkr,
            risk_preference=risk_preference,
            max_positions=max_positions,
        )

        logger.info("gemini_agent.reasoning_start", model=self._cfg.gemini_model)

        try:
            response = await self._model.generate_content_async(prompt)
            raw = response.text.strip()
            logger.debug("gemini_agent.raw_response", length=len(raw))
        except Exception as exc:
            logger.error("gemini_agent.api_error", error=str(exc))
            raise

        # Parse JSON — model is instructed to return only JSON
        try:
            result: dict[str, Any] = json.loads(raw)
        except json.JSONDecodeError:
            # Attempt to extract JSON block if wrapped in markdown
            import re

            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
            if match:
                result = json.loads(match.group(1))
            else:
                logger.error("gemini_agent.json_parse_failed", raw=raw[:500])
                raise ValueError(f"Gemini returned non-JSON output: {raw[:200]}")

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
    def _system_prompt() -> str:
        return textwrap.dedent("""
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
        """).strip()


    def _build_prompt(
        self,
        signals: list[Signal],
        conflicts: list[ConflictReport],
        snapshot: MarketSnapshot,
        articles: list[NewsArticle],
        capital_pkr: float,
        risk_preference: RiskLevel,
        max_positions: int,
    ) -> str:
        bull = [s for s in signals if s.direction == SignalDirection.BULLISH]
        bear = [s for s in signals if s.direction == SignalDirection.BEARISH]

        instructions = [
            f"1. Select up to {max_positions} stocks from the bullish signals.",
            "2. Allocate capital proportional to signal strength and risk level.",
            "3. Address every detected conflict in conflicts_addressed.",
            "4. Set cash_allocation_pct to reflect uncertainty / market risk.",
            "5. Be conservative if macro conditions are adverse.",
        ]

        if capital_pkr > 500000 and max_positions >= 5:
            instructions.append(
                "6. DIVERSIFICATION INSTRUCTION: Spread positions across at least 3 different sectors, "
                "avoid allocating more than 40% to any single sector, and consider mid-confidence signals "
                "from underrepresented sectors over high-confidence signals from already-represented ones."
            )

        instructions_text = "\n".join(instructions)

        return textwrap.dedent(f"""
            ## PSX Portfolio Construction Task

            ### Investor Parameters
            - Capital: PKR {capital_pkr:,.0f}
            - Risk preference: {risk_preference.value}
            - Max positions: {max_positions}
            - Max single stock: {self._cfg.portfolio_max_single_stock_pct * 100:.0f}%

            ### Market Conditions
            {_fmt_market(snapshot)}

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
            {_PORTFOLIO_JSON_SCHEMA}

            ### Instructions
            {instructions_text}
        """).strip()
