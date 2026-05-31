"""
Base scraper class with shared retry, rate-limiting, and header rotation logic.
All concrete scrapers inherit from BaseScraper.
"""

from __future__ import annotations

import asyncio
import random
import re
from abc import ABC, abstractmethod
from typing import Any

import httpx
from fake_useragent import UserAgent
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import get_settings
from app.logger import get_logger

logger = get_logger(__name__)
_ua = UserAgent()


class ScraperError(Exception):
    """Raised when a scraper cannot retrieve data after all retries."""


class BaseScraper(ABC):
    """
    Abstract base for all HTTP scrapers.

    Provides:
    - Async httpx client with connection pooling
    - Randomised User-Agent rotation
    - Exponential-backoff retry via tenacity
    - Polite delay between requests
    """

    def __init__(self, base_url: str, *, min_delay: float = 1.0, max_delay: float = 3.0) -> None:
        cfg = get_settings()
        self.base_url = base_url.rstrip("/")
        self.timeout = cfg.scraper_timeout_seconds
        self.max_retries = cfg.scraper_max_retries
        self.retry_wait = cfg.scraper_retry_wait_seconds
        self.min_delay = min_delay
        self.max_delay = max_delay
        self._client: httpx.AsyncClient | None = None

    # ── Client lifecycle ──────────────────────────────────────────────────────

    async def __aenter__(self) -> BaseScraper:
        self._client = httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True,
            headers=self._base_headers(),
        )
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _base_headers(self) -> dict[str, str]:
        return {
            "User-Agent": _ua.random,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        }

    async def _polite_delay(self) -> None:
        delay = random.uniform(self.min_delay, self.max_delay)
        await asyncio.sleep(delay)

    async def get(self, url: str, **kwargs: Any) -> httpx.Response:
        """
        Perform a GET request with automatic retries and polite delays.
        Raises ScraperError if all attempts fail.
        """
        if self._client is None:
            raise RuntimeError("Use BaseScraper as an async context manager.")

        await self._polite_delay()

        try:
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(self.max_retries),
                wait=wait_exponential(multiplier=self.retry_wait, min=1, max=30),
                retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
                reraise=True,
            ):
                with attempt:
                    # Rotate UA on each retry
                    self._client.headers.update({"User-Agent": _ua.random})
                    resp = await self._client.get(url, **kwargs)
                    resp.raise_for_status()
                    logger.debug("scraper.get.ok", url=url, status=resp.status_code)
                    return resp
        except Exception as exc:
            logger.error("scraper.get.failed", url=url, error=str(exc))
            raise ScraperError(f"Failed to fetch {url}: {exc}") from exc

        # unreachable — satisfies type checker
        raise ScraperError(f"Failed to fetch {url}")

    # ── Abstract interface ────────────────────────────────────────────────────

    @abstractmethod
    async def scrape(self) -> Any:
        """Entry point for concrete scrapers. Returns domain-specific data."""
        ...

def parse_float(text: str | None, fallback: float = 0.0) -> float:
    if not text:
        return fallback
    cleaned = re.sub(r"[^\d.\-]", "", text.strip())
    if cleaned.count("-") > 1:
        cleaned = cleaned.replace("-", "")
    try:
        return float(cleaned)
    except ValueError:
        return fallback


def parse_int(text: str | None, fallback: int = 0) -> int:
    return int(parse_float(text, float(fallback)))
