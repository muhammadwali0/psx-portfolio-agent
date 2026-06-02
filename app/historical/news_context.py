"""Build structured news context for Gemini prompt injection."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.historical.db import HistoricalDatabase
from app.historical.news_store import NewsStore
from app.logger import get_logger

logger = get_logger(__name__)

_CATEGORY_TAG = {
    "macro": "MACRO",
    "geopolitical": "GEO",
    "sector": "SECTOR",
    "global": "GLOBAL",
    "corporate": "CORPORATE",
}


def _age_hours(published_at: str) -> float:
    try:
        pub = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        if pub.tzinfo is None:
            pub = pub.replace(tzinfo=UTC)
        delta = datetime.now(tz=UTC) - pub
        return round(delta.total_seconds() / 3600, 1)
    except (ValueError, TypeError):
        return 0.0


def _enrich_entry(article: dict[str, Any]) -> dict[str, Any]:
    return {
        "category": article["category"],
        "title": article["title"],
        "summary": article.get("summary") or "",
        "source": article.get("source") or "",
        "published_at": article["published_at"],
        "age_hours": _age_hours(article["published_at"]),
        "tickers_mentioned": article.get("tickers_mentioned") or [],
    }


class NewsContextBuilder:
    """Assemble filtered news context for Gemini prompts."""

    def build(
        self,
        db: HistoricalDatabase,
        sectors: list[str],
        investment_mode: str,
    ) -> dict[str, list[dict[str, Any]]]:
        del investment_mode  # reserved for future mode-specific filtering
        try:
            macro_raw = NewsStore.get_macro_context(db, days_back=7)
            sector_raw = NewsStore.query_relevant(
                db, sectors, days_back=14, limit=20
            )
            macro_context = [_enrich_entry(a) for a in macro_raw[:10]]
            sector_news = [_enrich_entry(a) for a in sector_raw[:20]]
            return {"macro_context": macro_context, "sector_news": sector_news}
        except Exception as exc:
            logger.warning("news_context.build_failed", error=str(exc))
            return {"macro_context": [], "sector_news": []}

    @staticmethod
    def format_for_prompt(context: dict[str, list[dict[str, Any]]]) -> str:
        macro = context.get("macro_context") or []
        sector = context.get("sector_news") or []
        if not macro and not sector:
            return ""

        lines: list[str] = []

        if macro:
            lines.append("=== MACRO & GEOPOLITICAL CONTEXT (last 7 days) ===")
            for entry in macro:
                lines.extend(_format_article_lines(entry))

        if sector:
            lines.append("")
            lines.append("=== SECTOR & MARKET NEWS (last 14 days) ===")
            for entry in sector:
                lines.extend(_format_article_lines(entry))

        lines.append("")
        lines.append(
            "NOTE: The macro, geopolitical, and sector news above represents the "
            "real-world backdrop for this portfolio. Factor it heavily into your reasoning:"
        )
        lines.append(
            "- Macro news (SBP rate, inflation, PKR) affects all equities and the risk-free rate"
        )
        lines.append(
            "- Geopolitical news affects market sentiment and specific sectors"
        )
        lines.append("- Sector news affects allocation weights for impacted sectors")
        lines.append(
            "- Do not ignore articles just because they don't mention a specific ticker"
        )

        return "\n".join(lines)


def _format_article_lines(entry: dict[str, Any]) -> list[str]:
    cat = entry.get("category", "corporate")
    tag = _CATEGORY_TAG.get(cat, "NEWS")
    tickers = entry.get("tickers_mentioned") or []
    if cat == "corporate" and tickers:
        tag = f"CORPORATE/{tickers[0].upper()}"

    title = entry.get("title", "")
    age = entry.get("age_hours", 0.0)
    summary = entry.get("summary") or ""
    if len(summary) > 200:
        summary = summary[:197] + "..."

    return [
        f"[{tag}] {title} ({age}h ago)",
        f"  → {summary}",
        "",
    ]
