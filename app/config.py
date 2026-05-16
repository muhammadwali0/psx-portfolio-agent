"""
Centralised configuration — loaded once at startup.
All secrets come from environment variables / .env file.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings validated by Pydantic."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ─────────────────────────────────────────────────────────
    app_name: str = "PSX Portfolio Construction Agent"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    log_level: str = "INFO"

    # ── API Server ───────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8080
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["*"]

    # ── Google / Gemini ──────────────────────────────────────────────────────
    google_api_key: str = Field(..., description="Gemini API key")
    gemini_model: str = "gemini-2.5-pro"
    gemini_temperature: float = 0.2
    gemini_max_output_tokens: int = 8192
    google_cloud_project: str | None = None
    google_cloud_region: str = "us-central1"

    # ── Scraping ─────────────────────────────────────────────────────────────
    scraper_timeout_seconds: int = 30
    scraper_max_retries: int = 3
    scraper_retry_wait_seconds: float = 2.0
    psx_base_url: str = "https://www.psx.com.pk"
    dawn_business_url: str = "https://www.dawn.com/business"
    ary_business_url: str = "https://arynews.tv/category/business"
    geo_business_url: str = "https://www.geo.tv/category/business"

    # ── Cache (optional — falls back to in-process cache) ───────────────────
    cache_ttl_seconds: int = 300  # 5 minutes for market data
    news_cache_ttl_seconds: int = 900  # 15 minutes for news

    # ── Portfolio Defaults ───────────────────────────────────────────────────
    portfolio_capital_pkr: float = 1_000_000.0  # 10 lac default
    portfolio_max_positions: int = 10
    portfolio_max_single_stock_pct: float = 0.20  # 20 % cap per stock
    portfolio_min_single_stock_pct: float = 0.02  # 2 % floor
    risk_free_rate: float = 0.21  # SBP policy rate approx

    @field_validator("log_level")
    @classmethod
    def _upper_log(cls, v: str) -> str:
        return v.upper()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton of Settings."""
    return Settings()  # type: ignore[call-arg]
