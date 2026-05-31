"""Download and ingest PSX daily archive files."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any
from zoneinfo import ZoneInfo

import httpx
from fake_useragent import UserAgent
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.historical.calendar import trading_days_back, trading_days_window
from app.historical.db import HistoricalDatabase
from app.historical.parsers import (
    parse_futures_open_interest,
    parse_gis_revaluation_rates,
    parse_index_constituents,
    parse_mkt_summary,
    parse_off_market_transactions,
)
from app.logger import get_logger

logger = get_logger(__name__)
_ua = UserAgent()

PKT = ZoneInfo("Asia/Karachi")
META_BACKFILL_DONE = "backfill_90d_done"

# type -> (url segment, extension)
DAILY_FILES: dict[str, tuple[str, str]] = {
    "mkt_summary": ("mkt_summary", "Z"),
    "indhist": ("indhist", "xls"),
    "reval_rates_gis": ("reval_rates_gis", "csv"),
    "fut_opn_int": ("fut_opn_int", "xls"),
    "omts": ("omts", "csv"),
}


@dataclass
class DayIngestResult:
    trade_date: date
    downloaded: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    rows: dict[str, int] = field(default_factory=dict)


class DailyDownloadService:
    """
    Fetches PSX end-of-day files from dps.psx.com.pk and stores parsed rows in SQLite.

    Idempotent: all inserts use INSERT OR IGNORE.
    """

    def __init__(
        self,
        db: HistoricalDatabase | None = None,
        *,
        base_url: str | None = None,
        timeout: float | None = None,
    ) -> None:
        cfg = get_settings()
        self.db = db or HistoricalDatabase()
        self.base_url = (base_url or cfg.psx_download_base_url).rstrip("/")
        self.timeout = timeout or float(cfg.scraper_timeout_seconds)
        self.backfill_days = cfg.historical_backfill_days
        self.db.initialize()

    def run(self, *, as_of: date | None = None) -> list[DayIngestResult]:
        """
        Ingest ``as_of`` (default: today in PKT). On first run, backfill the last
        ``historical_backfill_days`` trading weekdays.
        """
        trade_date = as_of or datetime.now(PKT).date()
        results: list[DayIngestResult] = []

        if self.db.get_meta(META_BACKFILL_DONE) != "1":
            for d in trading_days_window(trade_date, self.backfill_days):
                results.append(self.ingest_day(d))
            self.db.set_meta(META_BACKFILL_DONE, "1")
            logger.info("historical.backfill_complete", days=len(results))
        else:
            results.append(self.ingest_day(trade_date))

        return results

    def ingest_day(self, trade_date: date) -> DayIngestResult:
        result = DayIngestResult(trade_date=trade_date)
        payloads = self._download_day(trade_date)

        if not payloads:
            logger.info("historical.day_skipped", date=trade_date.isoformat(), reason="no_files")
            return result

        if "mkt_summary" in payloads:
            rows = parse_mkt_summary(payloads["mkt_summary"], trade_date)
            result.rows["daily_ohlcv"] = self.db.insert_ohlcv(rows)
            result.downloaded.append("mkt_summary")

        if "indhist" in payloads:
            rows = parse_index_constituents(payloads["indhist"], trade_date)
            result.rows["index_constituents"] = self.db.insert_index_constituents(rows)
            result.downloaded.append("indhist")

        if "reval_rates_gis" in payloads:
            rows = parse_gis_revaluation_rates(payloads["reval_rates_gis"], trade_date)
            result.rows["gis_rates"] = self.db.insert_gis_rates(rows)
            result.downloaded.append("reval_rates_gis")

        if "fut_opn_int" in payloads:
            rows = parse_futures_open_interest(payloads["fut_opn_int"], trade_date)
            result.rows["futures_open_interest"] = self.db.insert_futures_oi(rows)
            result.downloaded.append("fut_opn_int")

        if "omts" in payloads:
            rows = parse_off_market_transactions(payloads["omts"], trade_date)
            result.rows["off_market_transactions"] = self.db.insert_off_market(rows)
            result.downloaded.append("omts")

        for key in DAILY_FILES:
            if key not in result.downloaded and key not in result.skipped:
                result.skipped.append(key)

        logger.info(
            "historical.day_ingested",
            date=trade_date.isoformat(),
            downloaded=result.downloaded,
            rows=result.rows,
        )
        return result

    def _download_day(self, trade_date: date) -> dict[str, bytes]:
        iso = trade_date.isoformat()
        out: dict[str, bytes] = {}
        with httpx.Client(
            timeout=self.timeout,
            follow_redirects=True,
            headers={
                "User-Agent": _ua.random,
                "Accept": "*/*",
            },
        ) as client:
            for key, (segment, ext) in DAILY_FILES.items():
                url = f"{self.base_url}/{segment}/{iso}.{ext}"
                try:
                    raw = self._fetch_bytes(client, url)
                except FileNotFoundError:
                    logger.debug("historical.file_missing", url=url)
                    continue
                except Exception as exc:
                    logger.warning("historical.file_error", url=url, error=str(exc))
                    continue
                if raw:
                    out[key] = raw
        return out

    @retry(
        retry=retry_if_exception_type(httpx.HTTPError),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        reraise=True,
    )
    def _fetch_bytes(self, client: httpx.Client, url: str) -> bytes:
        resp = client.get(url)
        if resp.status_code == 404:
            raise FileNotFoundError(url)
        if resp.status_code != 200:
            raise httpx.HTTPStatusError(
                f"HTTP {resp.status_code}", request=resp.request, response=resp
            )
        content = resp.content
        if len(content) < 128 and b"<html" in content[:512].lower():
            raise FileNotFoundError(url)
        return content

    def recent_trading_dates(self, count: int, *, end: date | None = None) -> list[date]:
        return trading_days_back(end or datetime.now(PKT).date(), count)
