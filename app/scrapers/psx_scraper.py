"""
PSX Market Data Scraper
=======================
Scrapes live quotes, KSE-100 index data, and sector-level statistics
from the Pakistan Stock Exchange website.

Targets:
  - https://www.psx.com.pk/market-summary        (index overview)
  - https://www.psx.com.pk/market/equities        (all-shares board)

The parser is intentionally defensive — PSX's HTML structure changes
occasionally, so every extraction is wrapped in try/except with a fallback
to keep partial data flowing.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from bs4 import BeautifulSoup, Tag

from app.config import get_settings
from app.logger import get_logger
from app.models import MarketSnapshot, StockQuote
from app.scrapers.base import BaseScraper, ScraperError

logger = get_logger(__name__)


# ─── Selectors / patterns ──────────────────────────────────────────────────────

_MARKET_SUMMARY_PATH = "/market-summary"
_EQUITIES_PATH = "/market/equities"

# Regex to strip PKR formatting
_NUM_RE = re.compile(r"[^\d.\-]")


def _parse_float(text: str | None, fallback: float = 0.0) -> float:
    if not text:
        return fallback
    cleaned = _NUM_RE.sub("", text.strip())
    try:
        return float(cleaned)
    except ValueError:
        return fallback


def _parse_int(text: str | None, fallback: int = 0) -> int:
    return int(_parse_float(text, float(fallback)))


# ─── Scraper ──────────────────────────────────────────────────────────────────

class PSXScraper(BaseScraper):
    """
    Scrapes PSX market data and returns a :class:`~app.models.MarketSnapshot`.

    Usage::

        async with PSXScraper() as scraper:
            snapshot = await scraper.scrape()
    """

    def __init__(self) -> None:
        cfg = get_settings()
        super().__init__(cfg.psx_base_url, min_delay=1.5, max_delay=4.0)

    # ── Public API ─────────────────────────────────────────────────────────────

    async def scrape(self) -> MarketSnapshot:
        """Fetch and return a complete MarketSnapshot."""
        logger.info("psx_scraper.start")
        snapshot = MarketSnapshot()

        try:
            await self._fetch_market_summary(snapshot)
        except ScraperError as exc:
            logger.warning("psx_scraper.summary_failed", error=str(exc))

        try:
            quotes = await self._fetch_equities_board()
            snapshot.quotes = quotes
        except ScraperError as exc:
            logger.warning("psx_scraper.equities_failed", error=str(exc))

        snapshot.scraped_at = datetime.utcnow()
        logger.info(
            "psx_scraper.done",
            kse100=snapshot.kse100_index,
            quote_count=len(snapshot.quotes),
        )
        return snapshot

    async def get_top_movers(self, n: int = 20) -> dict[str, list[StockQuote]]:
        """Return top gainers and losers from today's session."""
        async with PSXScraper() as scraper:
            snap = await scraper.scrape()
        sorted_by_change = sorted(snap.quotes, key=lambda q: q.change_pct)
        return {
            "top_gainers": list(reversed(sorted_by_change))[:n],
            "top_losers": sorted_by_change[:n],
        }

    # ── Private parsers ────────────────────────────────────────────────────────

    async def _fetch_market_summary(self, snapshot: MarketSnapshot) -> None:
        url = self.base_url + _MARKET_SUMMARY_PATH
        resp = await self.get(url)
        soup = BeautifulSoup(resp.text, "lxml")
        self._parse_index_block(soup, snapshot)

    def _parse_index_block(self, soup: BeautifulSoup, snapshot: MarketSnapshot) -> None:
        """Extract KSE-100 index values from the market summary page."""
        # Look for a block containing "KSE-100" heading
        for tag in soup.find_all(True, string=re.compile(r"KSE.?100", re.I)):
            parent: Tag = tag.find_parent(["div", "section", "article", "tr"])
            if parent is None:
                continue
            text_nodes = parent.get_text(" ", strip=True)
            nums = re.findall(r"[\d,]+\.?\d*", text_nodes)
            float_nums = [_parse_float(n) for n in nums if n]
            if len(float_nums) >= 2:
                snapshot.kse100_index = float_nums[0]
                snapshot.kse100_change = float_nums[1] if len(float_nums) > 1 else 0.0
                if snapshot.kse100_index:
                    snapshot.kse100_change_pct = (
                        snapshot.kse100_change / snapshot.kse100_index
                    ) * 100
                break

        # Advances / Declines
        for label, attr in [
            (r"advance", "advances"),
            (r"decline", "declines"),
            (r"unchanged", "unchanged"),
        ]:
            tag = soup.find(True, string=re.compile(label, re.I))
            if tag:
                sibling = tag.find_next_sibling()
                if sibling:
                    setattr(snapshot, attr, _parse_int(sibling.get_text()))

    async def _fetch_equities_board(self) -> list[StockQuote]:
        url = self.base_url + _EQUITIES_PATH
        resp = await self.get(url)
        soup = BeautifulSoup(resp.text, "lxml")
        return self._parse_equities_table(soup)

    def _parse_equities_table(self, soup: BeautifulSoup) -> list[StockQuote]:
        """Parse the main equities table into StockQuote objects."""
        quotes: list[StockQuote] = []

        table = soup.find("table")
        if not table:
            logger.warning("psx_scraper.no_table_found")
            return quotes

        headers: list[str] = []
        header_row = table.find("thead")
        if header_row:
            headers = [
                th.get_text(strip=True).lower().replace(" ", "_")
                for th in header_row.find_all(["th", "td"])
            ]

        tbody = table.find("tbody") or table
        for row in tbody.find_all("tr"):
            cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
            if len(cells) < 5:
                continue
            try:
                quote = self._row_to_quote(cells, headers)
                if quote:
                    quotes.append(quote)
            except Exception as exc:
                logger.debug("psx_scraper.row_parse_error", error=str(exc))
                continue

        logger.info("psx_scraper.parsed_quotes", count=len(quotes))
        return quotes

    def _row_to_quote(
        self, cells: list[str], headers: list[str]
    ) -> StockQuote | None:
        """Map a table row to a StockQuote. Returns None if symbol is missing."""

        def _cell(name: str, idx: int, default: str = "0") -> str:
            if name in headers:
                i = headers.index(name)
                return cells[i] if i < len(cells) else default
            return cells[idx] if idx < len(cells) else default

        symbol = _cell("symbol", 0, "").upper()
        if not symbol or not re.match(r"^[A-Z]{2,10}$", symbol):
            return None

        return StockQuote(
            symbol=symbol,
            company_name=_cell("company", 1, ""),
            sector=_cell("sector", 2, ""),
            current_price=_parse_float(_cell("current", 3)),
            open_price=_parse_float(_cell("open", 4)),
            high_price=_parse_float(_cell("high", 5)),
            low_price=_parse_float(_cell("low", 6)),
            prev_close=_parse_float(_cell("ldcp", 7)),
            volume=_parse_int(_cell("volume", 8)),
            source_url=self.base_url + _EQUITIES_PATH,
        )

    # ── Static / offline helpers (useful for unit tests) ──────────────────────

    @staticmethod
    def parse_snapshot_from_html(html: str) -> MarketSnapshot:
        """
        Parse a MarketSnapshot from raw HTML string.
        Useful for offline / unit testing without network access.
        """
        scraper = PSXScraper.__new__(PSXScraper)
        scraper.base_url = get_settings().psx_base_url
        soup = BeautifulSoup(html, "lxml")
        snap = MarketSnapshot()
        scraper._parse_index_block(soup, snap)
        snap.quotes = scraper._parse_equities_table(soup)
        return snap
