"""
Financial News Scraper
======================
Scrapes business news from:
  - Dawn Business  (https://www.dawn.com/business)
  - ARY Business   (https://arynews.tv/category/business)
  - Geo Business   (https://www.geo.tv/category/business)

Each source has its own parser method; the unified ``scrape()`` call
aggregates results and deduplicates by URL.

The scraper also runs a lightweight ticker-mention pass so downstream
signal extraction knows which stocks each article is about.
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.config import get_settings
from app.logger import get_logger
from app.models import NewsArticle, SignalSource
from app.scrapers.base import BaseScraper, ScraperError

logger = get_logger(__name__)

# ─── Known PSX ticker list for mention extraction ─────────────────────────────
# Minimal seed list; extend via config or an external file in production.
_PSX_TICKERS: frozenset[str] = frozenset([
    "ENGRO", "LUCK", "HBL", "UBL", "MCB", "NBP", "OGDC", "PPL", "PSO",
    "HUBC", "KAPCO", "NESTLE", "SHEL", "MARI", "FFC", "FATIMA", "DGKC",
    "KOHC", "MLCF", "FFBL", "EFERT", "ICI", "SNGP", "SSGC", "KEL",
    "PAKT", "GATM", "BAFL", "MEBL", "BAHL", "ABL", "AKBL",
    "SEARL", "FEROZ", "GLAXO", "ABOT", "SIEM", "LOTCHEM",
    "NRL", "APL", "HASCOL", "BYCO", "ATRL", "CNERGYICO",
    "PAEL", "HCAR", "INDU", "PSMC", "GHNL", "CHCC",
])

_TICKER_RE = re.compile(
    r"\b(" + "|".join(sorted(_PSX_TICKERS, key=len, reverse=True)) + r")\b"
)


def _extract_tickers(text: str) -> list[str]:
    return list(dict.fromkeys(_TICKER_RE.findall(text.upper())))


def _parse_date(text: str | None) -> datetime | None:
    if not text:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%B %d, %Y", "%d %B %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text.strip(), fmt)
        except ValueError:
            continue
    return None


# ─────────────────────────────────────────────────────────────────────────────


class NewsScraper(BaseScraper):
    """
    Multi-source financial news scraper.

    Usage::

        async with NewsScraper() as scraper:
            articles = await scraper.scrape()
    """

    def __init__(self) -> None:
        cfg = get_settings()
        # Use Dawn as the primary base; other URLs are passed per-fetch
        super().__init__(cfg.dawn_business_url, min_delay=2.0, max_delay=5.0)
        self._cfg = cfg

    # ── Public API ─────────────────────────────────────────────────────────────

    async def scrape(self) -> list[NewsArticle]:
        """Aggregate news from all configured sources concurrently."""
        logger.info("news_scraper.start")

        tasks = [
            self._scrape_dawn(),
            self._scrape_ary(),
            self._scrape_geo(),
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        articles: list[NewsArticle] = []
        seen_urls: set[str] = set()

        for result in results:
            if isinstance(result, Exception):
                logger.warning("news_scraper.source_failed", error=str(result))
                continue
            for art in result:
                if art.url not in seen_urls:
                    seen_urls.add(art.url)
                    articles.append(art)

        logger.info("news_scraper.done", total=len(articles))
        return articles

    async def scrape_article_text(self, url: str) -> str:
        """Fetch the full body text of a single article URL."""
        try:
            resp = await self.get(url)
            soup = BeautifulSoup(resp.text, "lxml")
            # Remove scripts/styles
            for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
                tag.decompose()
            # Try article body selectors
            for sel in ["article", ".story-content", ".entry-content", ".article-body", "main"]:
                block = soup.select_one(sel)
                if block:
                    return block.get_text(" ", strip=True)[:8000]
            return soup.get_text(" ", strip=True)[:8000]
        except ScraperError as exc:
            logger.warning("news_scraper.article_fetch_failed", url=url, error=str(exc))
            return ""

    # ── Source-specific parsers ────────────────────────────────────────────────

    async def _scrape_dawn(self) -> list[NewsArticle]:
        """Parse Dawn Business section."""
        url = self._cfg.dawn_business_url
        try:
            resp = await self.get(url)
        except ScraperError as exc:
            raise ScraperError(f"Dawn: {exc}") from exc

        soup = BeautifulSoup(resp.text, "lxml")
        articles: list[NewsArticle] = []

        # Dawn uses <article> tags with class "story"
        for item in soup.select("article.story, .article-card, .story-card")[:25]:
            try:
                a_tag = item.find("a", href=True)
                if not a_tag:
                    continue
                href = urljoin("https://www.dawn.com", a_tag["href"])
                title_tag = item.find(["h2", "h3", "h4"])
                title = title_tag.get_text(strip=True) if title_tag else a_tag.get_text(strip=True)
                if not title:
                    continue
                date_tag = item.find(["time", "span"], class_=re.compile(r"date|time", re.I))
                pub_date = _parse_date(
                    date_tag.get("datetime") or date_tag.get_text() if date_tag else None
                )
                summary_tag = item.find("p")
                summary = summary_tag.get_text(strip=True) if summary_tag else ""
                combined = f"{title} {summary}"
                articles.append(NewsArticle(
                    title=title,
                    url=href,
                    source=SignalSource.DAWN_BUSINESS,
                    published_at=pub_date,
                    summary=summary,
                    tickers_mentioned=_extract_tickers(combined),
                ))
            except Exception as exc:
                logger.debug("news_scraper.dawn_item_error", error=str(exc))

        logger.info("news_scraper.dawn_done", count=len(articles))
        return articles

    async def _scrape_ary(self) -> list[NewsArticle]:
        """Parse ARY Business section."""
        url = self._cfg.ary_business_url
        try:
            resp = await self.get(url)
        except ScraperError as exc:
            raise ScraperError(f"ARY: {exc}") from exc

        soup = BeautifulSoup(resp.text, "lxml")
        articles: list[NewsArticle] = []

        for item in soup.select(".jeg_post, .post-block, article")[:25]:
            try:
                a_tag = item.find("a", href=True)
                if not a_tag:
                    continue
                href = a_tag["href"]
                if not href.startswith("http"):
                    href = urljoin("https://arynews.tv", href)
                title_tag = item.find(["h2", "h3", "h4", ".jeg_post_title"])
                title = title_tag.get_text(strip=True) if title_tag else a_tag.get_text(strip=True)
                if not title:
                    continue
                date_tag = item.find("time")
                pub_date = _parse_date(
                    date_tag.get("datetime") or date_tag.get_text() if date_tag else None
                )
                articles.append(NewsArticle(
                    title=title,
                    url=href,
                    source=SignalSource.ARY_BUSINESS,
                    published_at=pub_date,
                    tickers_mentioned=_extract_tickers(title),
                ))
            except Exception as exc:
                logger.debug("news_scraper.ary_item_error", error=str(exc))

        logger.info("news_scraper.ary_done", count=len(articles))
        return articles

    async def _scrape_geo(self) -> list[NewsArticle]:
        """Parse Geo Business section."""
        url = self._cfg.geo_business_url
        try:
            resp = await self.get(url)
        except ScraperError as exc:
            raise ScraperError(f"Geo: {exc}") from exc

        soup = BeautifulSoup(resp.text, "lxml")
        articles: list[NewsArticle] = []

        for item in soup.select(".story, .news-item, article, .card")[:25]:
            try:
                a_tag = item.find("a", href=True)
                if not a_tag:
                    continue
                href = a_tag["href"]
                if not href.startswith("http"):
                    href = urljoin("https://www.geo.tv", href)
                title_tag = item.find(["h2", "h3", "h4"])
                title = title_tag.get_text(strip=True) if title_tag else a_tag.get_text(strip=True)
                if not title:
                    continue
                date_tag = item.find("time")
                pub_date = _parse_date(
                    date_tag.get("datetime") or date_tag.get_text() if date_tag else None
                )
                articles.append(NewsArticle(
                    title=title,
                    url=href,
                    source=SignalSource.GEO_BUSINESS,
                    published_at=pub_date,
                    tickers_mentioned=_extract_tickers(title),
                ))
            except Exception as exc:
                logger.debug("news_scraper.geo_item_error", error=str(exc))

        logger.info("news_scraper.geo_done", count=len(articles))
        return articles
