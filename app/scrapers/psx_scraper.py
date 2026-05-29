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

from playwright.async_api import async_playwright
from fake_useragent import UserAgent
from tenacity import retry, stop_after_attempt, wait_exponential

logger = get_logger(__name__)


# ─── Selectors / patterns ──────────────────────────────────────────────────────

_MARKET_SUMMARY_PATH = "/market-summary"
_EQUITIES_PATH = "/market/equities"

# Regex to strip PKR formatting
_NUM_RE = re.compile(r"[^\d.\-]")


def _parse_float(text: str | None, fallback: float = 0.0) -> float:
    if not text:
        return fallback
    cleaned = re.sub(r"[^\d.\-]", "", text.strip())
    # Handle edge case where negative sign is not at start
    if cleaned.count("-") > 1:
        cleaned = cleaned.replace("-", "")
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
        snapshot = await self.fetch()
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

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def fetch(self) -> MarketSnapshot:
        """
        Fetch market data using Playwright from https://dps.psx.com.pk/market-watch.
        Waits for the equities table to render and parses it.
        """
        ua = UserAgent()
        user_agent_string = ua.random

        async with async_playwright() as p:
            # Launch chromium with no-sandbox for Cloud Run compatibility
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox"],
            )
            try:
                context = await browser.new_context(user_agent=user_agent_string)
                page = await context.new_page()

                logger.info("psx_scraper.fetch.navigating", url="https://dps.psx.com.pk/market-watch")
                await page.goto(
                    "https://dps.psx.com.pk/market-watch",
                    wait_until="domcontentloaded",
                    timeout=60000,
                )

                # Wait for the equities table to render.
                # PSX uses JS to populate these tables.
                logger.info("psx_scraper.fetch.waiting_for_table")
                await page.wait_for_selector(
                    ".tbl tbody tr", state="visible", timeout=60000
                )

                # Extract the full page HTML
                html = await page.content()

                # Pass to existing parse method
                snapshot = self.parse_snapshot_from_html(html)

                # ALSO fetch market summary in the same context to get the index, since market-watch doesn't have it in easy structure
                summary_page = await context.new_page()
                summary_url = self.base_url + _MARKET_SUMMARY_PATH
                logger.info("psx_scraper.fetch.navigating_summary", url=summary_url)
                await summary_page.goto(
                    summary_url,
                    wait_until="domcontentloaded",
                    timeout=60000,
                )
                summary_html = await summary_page.content()
                summary_soup = BeautifulSoup(summary_html, "lxml")
                self._parse_index_block(summary_soup, snapshot)

                snapshot.scraped_at = datetime.utcnow()

                logger.info(
                    "psx_scraper.fetch.done",
                    kse100=snapshot.kse100_index,
                    quote_count=len(snapshot.quotes),
                )
                return snapshot

            except Exception as exc:
                logger.error("psx_scraper.fetch.failed", error=str(exc))
                raise ScraperError(f"Playwright fetch failed: {exc}") from exc
            finally:
                await browser.close()

    # ── Private parsers ────────────────────────────────────────────────────────

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def _fetch_market_summary(self, snapshot: MarketSnapshot) -> None:
        url = self.base_url + _MARKET_SUMMARY_PATH
        resp = await self.get(url)
        soup = BeautifulSoup(resp.text, "lxml")
        self._parse_index_block(soup, snapshot)

    def _parse_index_block(self, soup: BeautifulSoup, snapshot: MarketSnapshot) -> None:
        """Extract KSE-100 index values from the market summary page."""
        # Find KSE100 heading and extract the value from the h4 tag following it
        kse100_heading = soup.find(string=re.compile(r"KSE100", re.I))
        if kse100_heading:
            parent = kse100_heading.find_parent()
            # The h4 tag containing the value is typically the next tag sibling
            val_tag = parent.find_next_sibling("h4")
            if not val_tag:
                # Fallback: maybe it's not immediate
                val_tag = parent.find_next("h4")
            if val_tag:
                val = _parse_float(val_tag.get_text())
                if val:
                    snapshot.kse100_index = val
                    # Try to find change/pct in sibling col-xs-6 if available
                    col_parent = parent.find_parent("div")
                    if col_parent:
                        change_parent = col_parent.find_next_sibling("div", class_="col-xs-6")
                        if change_parent:
                            change_tag = change_parent.find("h5")
                            if change_tag:
                                snapshot.kse100_change = _parse_float(change_tag.get_text())
                                if snapshot.kse100_index:
                                    snapshot.kse100_change_pct = (
                                        snapshot.kse100_change / snapshot.kse100_index
                                    ) * 100

        # Advances / Declines
        for label, attr in [
            (r"advance", "advances"),
            (r"decline", "declines"),
            (r"unchanged", "unchanged"),
        ]:
            tag = soup.find(True, string=re.compile(label, re.I))
            if tag:
                parent = tag.find_parent()
                if parent:
                    # The value is typically in the parent's text
                    text = parent.get_text()
                    nums = re.findall(r"\d+", text)
                    if nums:
                        setattr(snapshot, attr, int(nums[0]))

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def _fetch_equities_board(self) -> list[StockQuote]:
        """Fetch equities from the dps market watch page."""
        url = "https://dps.psx.com.pk/market-watch"
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox"],
            )
            page = await browser.new_page()
            try:
                await page.goto(url, wait_until="domcontentloaded")
                # Wait for the table to load
                await page.wait_for_selector(".tbl tbody tr", state="visible", timeout=30000)
                html = await page.content()
                soup = BeautifulSoup(html, "lxml")
                return self._parse_equities_table(soup)
            finally:
                await browser.close()

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
