"""Persist and query news articles in SQLite."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any

from app.historical.db import HistoricalDatabase
from app.historical.news_categorizer import categorize, extract_keywords
from app.logger import get_logger
from app.models import NewsArticle

logger = get_logger(__name__)

_CATEGORY_SCORE: dict[str, float] = {
    "macro": 2.0,
    "geopolitical": 2.0,
    "sector": 1.5,
    "global": 1.0,
    "corporate": 0.5,
}


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt
    except ValueError:
        return None


def _row_to_dict(row: Any) -> dict[str, Any]:
    tickers = json.loads(row["tickers_mentioned"] or "[]")
    keywords = json.loads(row["keywords"] or "[]")
    return {
        "title": row["title"],
        "summary": row["summary"] or "",
        "source": row["source"],
        "published_at": row["published_at"],
        "category": row["category"],
        "tickers_mentioned": tickers,
        "keywords": keywords,
    }


class NewsStore:
    """SQLite-backed news article persistence and relevance queries."""

    @staticmethod
    def upsert_articles(db: HistoricalDatabase, articles: list[NewsArticle]) -> int:
        logger.info("news_store.upsert_start", article_count=len(articles))
        if not articles:
            return 0
        now_iso = datetime.now(tz=UTC).isoformat()
        inserted = 0
        with db.connect() as conn:
            before = conn.total_changes
            for article in articles:
                category = categorize(article.title, article.summary)
                keywords = extract_keywords(article.title, article.summary)
                published = (
                    article.published_at.isoformat()
                    if article.published_at
                    else now_iso
                )
                scraped = (
                    article.scraped_at.isoformat()
                    if article.scraped_at
                    else now_iso
                )
                source = (
                    article.source.value
                    if hasattr(article.source, "value")
                    else str(article.source)
                )
                conn.execute(
                    """
                    INSERT OR IGNORE INTO news_articles (
                        url, title, summary, source, published_at, scraped_at,
                        category, tickers_mentioned, keywords, relevance_score
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        article.url,
                        article.title,
                        article.summary or "",
                        source,
                        published,
                        scraped,
                        category,
                        json.dumps(article.tickers_mentioned or []),
                        json.dumps(keywords),
                        0.0,
                    ),
                )
            inserted = conn.total_changes - before
        logger.info("news_store.upserted", count=inserted)
        return inserted

    @staticmethod
    def prune_old_articles(db: HistoricalDatabase, days: int = 90) -> int:
        cutoff = (datetime.now(tz=UTC) - timedelta(days=days)).isoformat()
        with db.connect() as conn:
            cur = conn.execute(
                "DELETE FROM news_articles WHERE published_at < ?",
                (cutoff,),
            )
            deleted = cur.rowcount
        logger.info("news_store.pruned", count=deleted)
        return deleted

    @staticmethod
    def query_relevant(
        db: HistoricalDatabase,
        sectors: list[str],
        days_back: int = 14,
        limit: int = 30,
    ) -> list[dict[str, Any]]:
        cutoff = (datetime.now(tz=UTC) - timedelta(days=days_back)).isoformat()
        now = datetime.now(tz=UTC)
        sectors_lower = [s.lower() for s in sectors if s]

        with db.connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM news_articles
                WHERE published_at >= ?
                ORDER BY published_at DESC
                """,
                (cutoff,),
            ).fetchall()

        scored: list[tuple[float, dict[str, Any]]] = []
        for row in rows:
            item = _row_to_dict(row)
            score = float(row["relevance_score"])
            score += _CATEGORY_SCORE.get(row["category"], 0.0)

            kw_lower = [k.lower() for k in item["keywords"]]
            for sector in sectors_lower:
                if sector and any(sector in k or k in sector for k in kw_lower):
                    score += 1.0

            pub = _parse_dt(row["published_at"])
            if pub:
                age = now - pub
                if age <= timedelta(hours=48):
                    score += 0.5
                if age <= timedelta(days=7):
                    score += 0.3

            scored.append((score, item))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored[:limit]]

    @staticmethod
    def get_macro_context(
        db: HistoricalDatabase,
        days_back: int = 7,
    ) -> list[dict[str, Any]]:
        cutoff = (datetime.now(tz=UTC) - timedelta(days=days_back)).isoformat()
        with db.connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM news_articles
                WHERE published_at >= ?
                  AND category IN ('macro', 'geopolitical')
                ORDER BY published_at DESC
                LIMIT 15
                """,
                (cutoff,),
            ).fetchall()
        return [_row_to_dict(row) for row in rows]

    @staticmethod
    def count_recent(db: HistoricalDatabase, days: int = 90) -> int:
        """Count articles published within the last ``days`` (for manifest)."""
        try:
            with db.connect() as conn:
                row = conn.execute(
                    """
                    SELECT COUNT(*) AS cnt FROM news_articles
                    WHERE published_at >= date('now', ?)
                    """,
                    (f"-{days} days",),
                ).fetchone()
            return int(row["cnt"]) if row else 0
        except Exception:
            return 0
