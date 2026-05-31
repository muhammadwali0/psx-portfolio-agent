"""
Groq-powered PSX chatbot — answers from Redis pre-computed data only.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.config import get_settings
from app.data.store import MarketDataStore
from app.services.shariah import ShariahFilter
from app.logger import get_logger

logger = get_logger(__name__)

GROQ_API = "https://api.groq.com/openai/v1/chat/completions"


class GroqChatbot:
    """Retail Q&A over cached PSX quotes, MAs, sectors, and movers."""

    def __init__(self) -> None:
        self._cfg = get_settings()

    def _build_context(self, *, shariah_mode: bool = False) -> str:
        store = MarketDataStore.get_instance()
        store.require_ready()
        snap = store.get_market_snapshot()
        agg = store.get_aggregates()
        manifest = store.get_manifest()

        lines = ["PSX market context (cached — do not invent prices):"]
        if manifest:
            lines.append(
                f"Data as of {manifest.last_updated.isoformat()}, "
                f"trading day {manifest.trading_day}, risk-free {manifest.risk_free_rate * 100:.2f}%"
            )
        if snap:
            lines.append(
                f"KSE-100: {snap.kse100_index:,.0f} ({snap.kse100_change_pct:+.2f}%), "
                f"quotes: {len(snap.quotes)}"
            )
        if agg:
            lines.append(
                f"Breadth: +{agg.index_breadth.advances} / -{agg.index_breadth.declines} / "
                f"={agg.index_breadth.unchanged}"
            )
            for m in agg.top_movers_by_change_pct[:15]:
                lines.append(f"  {m.symbol}: PKR {m.current_price:.2f} ({m.change_pct:+.2f}%)")
            for s in agg.sector_performance[:10]:
                lines.append(f"  Sector {s.sector}: avg YTD {s.avg_ytd_pct:+.1f}%")
            for sym, ctx in list(agg.moving_averages.items())[:30]:
                lines.append(
                    f"  {sym} MA20={ctx.ma20} MA50={ctx.ma50} MA200={ctx.ma200} "
                    f"90d-range-pos={ctx.position_in_90d_range_pct}%"
                )
        if shariah_mode:
            shariah = ShariahFilter()
            universe = sorted(shariah.get_universe())
            lines.append(
                "SHARIAH MODE: Recommend ONLY KMI30/KMI-ALL-Shares compliant equities "
                f"({len(universe)} symbols). Do not suggest conventional bonds, MTS, or futures."
            )
            lines.append(
                f"Allowed equities (sample): {', '.join(universe[:35])}"
            )
            if snap and snap.gis:
                lines.append(
                    "For fixed income, recommend GIS Government Ijarah Sukuk (not conventional bonds):"
                )
                for g in snap.gis[:12]:
                    lines.append(
                        f"  Sukuk {g.symbol}: PKR {g.current_price:.2f}, yield {g.yield_pct:.2f}%"
                    )
        return "\n".join(lines)

    async def chat(
        self,
        message: str,
        history: list[dict[str, str]] | None = None,
        *,
        shariah_mode: bool = False,
    ) -> str:
        if not self._cfg.groq_api_key:
            return (
                "Groq chat is not configured. Set GROQ_API_KEY in the environment. "
                "All answers are served from Redis pre-computed PSX data."
            )

        context = self._build_context(shariah_mode=shariah_mode)
        system_extra = (
            " You are in Shariah-compliant mode: only discuss KMI-index Shariah equities "
            "and GIS Sukuk as the halal fixed-income alternative."
            if shariah_mode
            else ""
        )
        messages: list[dict[str, str]] = [
            {
                "role": "system",
                "content": (
                    "You are a PSX (Pakistan Stock Exchange) assistant. "
                    "Answer ONLY using the cached market data below. "
                    "If data is missing, say so — never scrape or guess live prices."
                    f"{system_extra}\n\n{context}"
                ),
            },
        ]
        for turn in (history or [])[-10:]:
            messages.append(turn)
        messages.append({"role": "user", "content": message})

        payload: dict[str, Any] = {
            "model": self._cfg.groq_model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 1024,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                GROQ_API,
                headers={
                    "Authorization": f"Bearer {self._cfg.groq_api_key}",
                    "Content-Type": "application/json",
                },
                content=json.dumps(payload),
            )
            resp.raise_for_status()
            data = resp.json()

        return data["choices"][0]["message"]["content"].strip()
