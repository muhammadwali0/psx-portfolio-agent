"""
PSX Market Scraper
==================
Scrapes live equities quotes from the Pakistan Stock Exchange Data Portal.
Target: https://dps.psx.com.pk/market-watch
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.logger import get_logger
from app.models import StockQuote
from app.scrapers.base import BaseScraper, parse_float, parse_int

logger = get_logger(__name__)


class MarketScraper(BaseScraper):
    """
    Scrapes live stock quotes from DPS market-watch page.
    """

    def __init__(self) -> None:
        # Use data portal base URL
        super().__init__("https://dps.psx.com.pk", min_delay=1.5, max_delay=4.0)

    async def scrape(self) -> list[StockQuote]:
        """Fetch and return a list of StockQuotes."""
        logger.info("market_scraper.start")
        if self._client is None:
            raise RuntimeError("Use MarketScraper as an async context manager.")

        url = f"{self.base_url}/market-watch"
        resp = await self.get(url)
        return self.parse_equities_table(resp.text)

    def parse_equities_table(self, html: str) -> list[StockQuote]:
        """Parse the equities table into StockQuote objects."""
        quotes: list[StockQuote] = []
        soup = BeautifulSoup(html, "lxml")
        table = soup.find("table")
        if not table:
            logger.warning("market_scraper.no_table_found")
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
                logger.debug("market_scraper.row_parse_error", error=str(exc))
                continue

        logger.info("market_scraper.parsed_quotes", count=len(quotes))
        return quotes

    def _row_to_quote(self, cells: list[str], headers: list[str]) -> StockQuote | None:
        """Map a table row to a StockQuote."""
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
            current_price=parse_float(_cell("current", 3)),
            open_price=parse_float(_cell("open", 4)),
            high_price=parse_float(_cell("high", 5)),
            low_price=parse_float(_cell("low", 6)),
            prev_close=parse_float(_cell("ldcp", 7)),
            volume=parse_int(_cell("volume", 8)),
            source_url=f"{self.base_url}/market-watch",
        )
