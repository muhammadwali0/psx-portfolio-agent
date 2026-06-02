"""CLI entrypoint for the nightly PSX historical download Cloud Run Job."""

from __future__ import annotations

import asyncio
import sys

from app.historical.db import HistoricalDatabase
from app.historical.download import DailyDownloadService
from app.historical.news_store import NewsStore
from app.logger import configure_logging, get_logger
from app.scrapers.news_scraper import NewsScraper

logger = get_logger(__name__)


async def _persist_news(db: HistoricalDatabase) -> tuple[int, int]:
    async with NewsScraper() as scraper:
        news_articles = await scraper.scrape()
    inserted = NewsStore.upsert_articles(db, news_articles)
    pruned = NewsStore.prune_old_articles(db, days=90)
    return inserted, pruned


def main() -> int:
    configure_logging()
    logger.info("historical.job.start")
    results = DailyDownloadService().run()
    for r in results:
        logger.info(
            "historical.job.day",
            date=r.trade_date.isoformat(),
            downloaded=r.downloaded,
            rows=r.rows,
        )
    logger.info("historical.job.done", days=len(results))

    db = HistoricalDatabase()
    db.initialize()
    try:
        inserted, pruned = asyncio.run(_persist_news(db))
        logger.info("job.news_persisted", inserted=inserted, pruned=pruned)
    except Exception as exc:
        logger.error("historical.job.news_failed", error=str(exc))

    return 0


if __name__ == "__main__":
    sys.exit(main())
