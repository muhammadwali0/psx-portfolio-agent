"""
PSX GIS Scraper
===============
Scrapes Government Ijarah Sukuk symbols and secondary market debt-board metrics.
Targets:
  - https://dps.psx.com.pk/gis/symbols
  - https://dps.psx.com.pk/market-watch-debt
"""

from __future__ import annotations

from typing import Any

from bs4 import BeautifulSoup

from app.logger import get_logger
from app.models import GISMetrics
from app.scrapers.base import BaseScraper, parse_float, parse_int

logger = get_logger(__name__)


class GISScraper(BaseScraper):
    """Scrapes Government Ijarah Sukuk instruments from the DPS portal."""

    def __init__(self) -> None:
        super().__init__("https://dps.psx.com.pk", min_delay=1.5, max_delay=4.0)

    async def scrape(self) -> list[GISMetrics]:
        """Fetch and return GIS instruments with debt-board trading metrics."""
        logger.info("gis_scraper.start")
        if self._client is None:
            raise RuntimeError("Use GISScraper as an async context manager.")

        symbols_resp = await self.get(f"{self.base_url}/gis/symbols")
        debt_resp = await self.get(f"{self.base_url}/market-watch-debt")

        symbols = self.parse_symbols(symbols_resp.json())
        return self.parse_debt_table(debt_resp.text, symbols)

    def parse_symbols(self, payload: Any) -> dict[str, str]:
        """Parse the GIS symbols endpoint into a symbol-to-name lookup."""
        rows = payload.get("data", payload) if isinstance(payload, dict) else payload
        symbols: dict[str, str] = {}

        if not isinstance(rows, list):
            return symbols

        for item in rows:
            if isinstance(item, dict):
                symbol = str(
                    item.get("symbol")
                    or item.get("SYM")
                    or item.get("code")
                    or item.get("id")
                    or ""
                ).strip().upper()
                name = str(
                    item.get("name")
                    or item.get("companyName")
                    or item.get("company")
                    or item.get("title")
                    or symbol
                ).strip()
            elif isinstance(item, str):
                symbol = item.strip().upper()
                name = symbol
            else:
                continue

            if symbol:
                symbols[symbol] = name or symbol

        return symbols

    def parse_debt_table(
        self, html: str, symbols: dict[str, str] | None = None
    ) -> list[GISMetrics]:
        """Parse DPS debt-board rows and keep only known GIS symbols when provided."""
        symbol_names = symbols or {}
        allowed_symbols = set(symbol_names)
        metrics: list[GISMetrics] = []
        soup = BeautifulSoup(html, "lxml")
        table = soup.find("table")

        if not table:
            logger.warning("gis_scraper.no_debt_table_found")
            return metrics

        headers = self._headers(table)
        tbody = table.find("tbody") or table

        for row in tbody.find_all("tr"):
            cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
            if len(cells) < 5:
                continue

            try:
                metric = self._row_to_metric(cells, headers, symbol_names, allowed_symbols)
                if metric:
                    metrics.append(metric)
            except Exception as exc:
                logger.debug("gis_scraper.row_parse_error", error=str(exc))
                continue

        logger.info("gis_scraper.parsed_gis", count=len(metrics))
        return metrics

    def _headers(self, table: Any) -> list[str]:
        header_row = table.find("thead")
        if not header_row:
            return []
        return [
            th.get_text(strip=True).lower().replace(" ", "_").replace("%", "pct")
            for th in header_row.find_all(["th", "td"])
        ]

    def _cell(self, cells: list[str], headers: list[str], names: tuple[str, ...], idx: int) -> str:
        for name in names:
            if name in headers:
                i = headers.index(name)
                return cells[i] if i < len(cells) else ""
        return cells[idx] if idx < len(cells) else ""

    def _row_to_metric(
        self,
        cells: list[str],
        headers: list[str],
        symbol_names: dict[str, str],
        allowed_symbols: set[str],
    ) -> GISMetrics | None:
        symbol = self._cell(cells, headers, ("symbol", "scrip", "security", "instrument"), 0)
        symbol = symbol.strip().upper()

        if not symbol:
            return None
        if allowed_symbols and symbol not in allowed_symbols:
            return None

        return GISMetrics(
            symbol=symbol,
            name=symbol_names.get(symbol, self._cell(cells, headers, ("name", "company"), 1)),
            sector=self._cell(cells, headers, ("sector",), 2) or "BILLS AND BONDS",
            current_price=parse_float(
                self._cell(cells, headers, ("current", "close", "price", "rate"), 3)
            ),
            open_price=parse_float(self._cell(cells, headers, ("open",), 4)),
            high_price=parse_float(self._cell(cells, headers, ("high",), 5)),
            low_price=parse_float(self._cell(cells, headers, ("low",), 6)),
            prev_close=parse_float(self._cell(cells, headers, ("ldcp", "prev_close"), 7)),
            volume=parse_int(self._cell(cells, headers, ("volume",), 8)),
            yield_pct=parse_float(self._cell(cells, headers, ("yield", "yield_pct"), 9)),
        )
