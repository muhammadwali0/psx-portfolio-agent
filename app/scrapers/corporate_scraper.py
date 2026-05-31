"""
PSX Corporate Scraper
=====================
Scrapes market index summaries, general board statistics, and futures data from the main PSX website.
Targets:
  - https://www.psx.com.pk/market-summary/           (Index snapshot and Board Stats)
  - https://www.psx.com.pk/psx/market-summary/future-contract-ajax  (Futures AJAX)
"""

from __future__ import annotations

import asyncio
import re
from typing import Any

from bs4 import BeautifulSoup

from app.logger import get_logger
from app.models import BoardStats, FuturesContract, IndexSnapshot
from app.scrapers.base import BaseScraper, parse_float, parse_int

logger = get_logger(__name__)


class CorporateScraper(BaseScraper):
    """
    Scrapes index summary, board statistics, and futures data from main PSX site.
    """

    def __init__(self) -> None:
        # Use main PSX base URL
        super().__init__("https://www.psx.com.pk", min_delay=1.5, max_delay=4.0)

    async def scrape(self) -> dict[str, Any]:
        """Fetch and return a dict with indices, board_stats, and futures."""
        logger.info("corporate_scraper.start")
        if self._client is None:
            raise RuntimeError("Use CorporateScraper as an async context manager.")

        (indices, board_stats), futures = await asyncio.gather(
            self.fetch_indices_and_board_stats(),
            self.fetch_futures(),
        )

        return {
            "indices": indices,
            "board_stats": board_stats,
            "futures": futures,
        }

    async def fetch_indices_and_board_stats(self) -> tuple[list[IndexSnapshot], BoardStats]:
        """Fetch indices and board stats from market-summary page."""
        url = f"{self.base_url}/market-summary/"
        resp = await self.get(url)
        return self.parse_indices_and_board_stats(resp.text)

    def parse_indices_and_board_stats(self, html: str) -> tuple[list[IndexSnapshot], BoardStats]:
        """Parse indices and board stats from a market-summary HTML document."""
        soup = BeautifulSoup(html, "lxml")
        indices: list[IndexSnapshot] = []
        summary_text = soup.get_text(" ", strip=True)
        for symbol in ["KSE100", "KSE30", "KMI30", "ALLSHR"]:
            text_index = self._parse_index_from_summary_text(summary_text, symbol)
            if text_index:
                indices.append(text_index)
                continue

            heading = soup.find(string=self._index_pattern(symbol))
            if heading:
                try:
                    parent = heading.find_parent()
                    val_tag = parent.find_next_sibling("h4") or parent.find_next("h4")
                    if not val_tag:
                        val_tag = parent.find_next_sibling()
                    val = parse_float(val_tag.get_text()) if val_tag else 0.0

                    change_val = 0.0
                    change_pct_val = 0.0
                    col_parent = parent.find_parent("div")
                    if col_parent:
                        change_parent = col_parent.find_next_sibling("div", class_="col-xs-6")
                        if change_parent:
                            change_tag = change_parent.find("h5")
                            change_pct_tag = change_parent.find("h6")

                            is_down = False
                            if change_tag:
                                classes = change_tag.get("class", [])
                                if "down" in classes:
                                    is_down = True

                            change_val = parse_float(change_tag.get_text()) if change_tag else 0.0
                            if is_down:
                                change_val = -abs(change_val)

                            if change_pct_tag:
                                pct_text = change_pct_tag.get_text().strip("()% ")
                                change_pct_val = parse_float(pct_text)
                                if is_down:
                                    change_pct_val = -abs(change_pct_val)

                    indices.append(IndexSnapshot(
                        symbol=symbol,
                        name=heading.get_text(strip=True),
                        current_value=val,
                        change=change_val,
                        change_pct=change_pct_val,
                    ))
                except Exception as exc:
                    logger.debug("corporate_scraper.index_parse_error", symbol=symbol, error=str(exc))
                    continue

        board_stats = BoardStats()
        self._parse_board_stats_from_text(summary_text, board_stats)

        return indices, board_stats

    def _index_pattern(self, symbol: str) -> re.Pattern[str]:
        parts = re.findall(r"[A-Za-z]+|\d+", symbol)
        return re.compile(r"[\s\-]*".join(parts), re.I)

    def _parse_index_from_summary_text(self, text: str, symbol: str) -> IndexSnapshot | None:
        normalized = re.sub(r"\s+", " ", text)
        match = re.search(
            rf"\b{re.escape(symbol)}\b\s+([\d,.]+)\s+(-?[\d,.]+)\s+\((-?[\d,.]+)%\)",
            normalized,
            re.I,
        )
        if not match:
            return None
        return IndexSnapshot(
            symbol=symbol,
            name=symbol,
            current_value=parse_float(match.group(1)),
            change=parse_float(match.group(2)),
            change_pct=parse_float(match.group(3)),
        )

    def _parse_board_stats_from_text(self, text: str, board_stats: BoardStats) -> None:
        normalized = re.sub(r"\s+", " ", text)
        board_match = re.search(
            r"Volume\s+(?P<volume>[\d,]+)\s+Value\s+(?P<value>[\d,.]+)\s+"
            r"Advanced\s+(?P<advances>\d+)\s+Declined\s+(?P<declines>\d+)\s+"
            r"Unchanged\s+(?P<unchanged>\d+)",
            normalized,
            re.I,
        )
        if board_match:
            board_stats.total_volume = parse_int(board_match.group("volume"))
            board_stats.total_value_mn = self._value_to_millions(board_match.group("value"))
            board_stats.advances = parse_int(board_match.group("advances"))
            board_stats.declines = parse_int(board_match.group("declines"))
            board_stats.unchanged = parse_int(board_match.group("unchanged"))
            return

        label_patterns = {
            "advances": r"\bAdvanc(?:ed|es)\b\s*[:\-]?\s*(\d+)",
            "declines": r"\bDeclin(?:ed|es)\b\s*[:\-]?\s*(\d+)",
            "unchanged": r"\bUnchanged\b\s*[:\-]?\s*(\d+)",
            "total_volume": r"\bVolume\b\s*[:\-]?\s*([\d,]+)",
            "total_value_mn": r"\bValue\b\s*[:\-]?\s*([\d,.]+)",
        }
        for attr, pattern in label_patterns.items():
            match = re.search(pattern, normalized, re.I)
            if not match:
                continue
            value = (
                self._value_to_millions(match.group(1))
                if attr == "total_value_mn"
                else parse_int(match.group(1))
            )
            setattr(board_stats, attr, value)

    def _value_to_millions(self, value: str) -> float:
        parsed = parse_float(value)
        return parsed / 1_000_000 if parsed > 1_000_000 else parsed

    async def fetch_futures(self) -> list[FuturesContract]:
        """Fetch all active futures contracts using the AJAX endpoint."""
        url = f"{self.base_url}/psx/market-summary/future-contract-ajax"
        
        # AJAX requests require specific headers to be accepted (avoid 403)
        headers = {
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{self.base_url}/market-summary/future-contracts/",
            "Origin": self.base_url
        }
        
        # Request month="0" (All) and limit="0" (No limit)
        payload = {
            "month": "0",
            "limit": "0"
        }

        # Perform POST request via the underlying client
        if self._client is None:
            raise RuntimeError("Use CorporateScraper as an async context manager.")
        
        # Apply polite delay before request
        await self._polite_delay()

        try:
            # Rotate UA in case of retry or headers
            self._client.headers.update(headers)
            resp = await self._client.post(url, data=payload)
            resp.raise_for_status()
            return self.parse_futures_html(resp.text)
        except Exception as exc:
            logger.error("corporate_scraper.fetch_futures_failed", error=str(exc))
            return []

    def parse_futures_html(self, html: str) -> list[FuturesContract]:
        """Parse futures HTML rows into FuturesContract models."""
        contracts: list[FuturesContract] = []
        soup = BeautifulSoup(html, "lxml")
        
        for row in soup.find_all("tr"):
            cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
            if len(cells) < 7:
                continue
            
            symbol = cells[0].upper()
            if not symbol or "-" not in symbol:
                continue
                
            try:
                open_price = parse_float(cells[1])
                high_price = parse_float(cells[2])
                low_price = parse_float(cells[3])
                current_price = parse_float(cells[4])
                change = parse_float(cells[5])
                volume = parse_int(cells[6])

                # Calculate change percentage based on prev close
                prev_close = current_price - change
                change_pct = (change / prev_close) * 100 if prev_close > 0 else 0.0

                contracts.append(FuturesContract(
                    symbol=symbol,
                    open_price=open_price,
                    high_price=high_price,
                    low_price=low_price,
                    current_price=current_price,
                    change=change,
                    change_pct=change_pct,
                    volume=volume,
                ))
            except Exception as exc:
                logger.debug("corporate_scraper.futures_row_parse_error", symbol=symbol, error=str(exc))
                continue
                
        logger.info("corporate_scraper.parsed_futures", count=len(contracts))
        return contracts
