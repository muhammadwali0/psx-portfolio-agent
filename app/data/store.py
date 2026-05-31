"""
MarketDataStore — Redis + in-memory fallback for all runtime market data.

User requests read only from this store. SQLite is touched at bootstrap / nightly job only.
"""

from __future__ import annotations

import json
import os
from typing import Any

from app.config import get_settings
from app.logger import get_logger
from app.models import (
    DataManifest,
    MarketSnapshot,
    NewsArticle,
    PrecomputedAggregates,
)

logger = get_logger(__name__)

KEY_SNAPSHOT = "psx:live:market_snapshot"
KEY_NEWS = "psx:live:news_articles"
KEY_AGGREGATES = "psx:precomputed:aggregates"
KEY_MANIFEST = "psx:manifest"
KEY_VOLATILITY = "psx:precomputed:volatility"


class MarketDataStore:
    """Singleton access to bootstrap-populated Redis keys."""

    _instance: MarketDataStore | None = None
    _memory: dict[str, str] = {}

    def __init__(self, redis_url: str | None = None) -> None:
        url = redis_url if redis_url is not None else os.environ.get("REDIS_URL", "")
        self._r = None
        if url:
            import redis

            self._r = redis.from_url(url, decode_responses=True)
            logger.info("market_store.redis_connected")

    @classmethod
    def get_instance(cls) -> MarketDataStore:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Test helper."""
        cls._instance = None
        cls._memory = {}

    def _get(self, key: str) -> str | None:
        if self._r:
            try:
                return self._r.get(key)
            except Exception as exc:
                logger.warning("market_store.get_failed", key=key, error=str(exc))
                return None
        return self._memory.get(key)

    def _set(self, key: str, value: str, ttl: int | None) -> None:
        if self._r:
            try:
                if ttl:
                    self._r.set(key, value, ex=ttl)
                else:
                    self._r.set(key, value)
            except Exception as exc:
                logger.warning("market_store.set_failed", key=key, error=str(exc))
        else:
            self._memory[key] = value

    # ── Live snapshot (5 min) ─────────────────────────────────────────────────

    def get_market_snapshot(self) -> MarketSnapshot | None:
        raw = self._get(KEY_SNAPSHOT)
        if not raw:
            return None
        try:
            return MarketSnapshot.model_validate_json(raw)
        except Exception as exc:
            logger.warning("market_store.snapshot_parse_failed", error=str(exc))
            return None

    def set_market_snapshot(self, snapshot: MarketSnapshot) -> None:
        cfg = get_settings()
        self._set(KEY_SNAPSHOT, snapshot.model_dump_json(), cfg.cache_ttl_seconds)

    # ── News (15 min) ───────────────────────────────────────────────────────

    def get_news_articles(self) -> list[NewsArticle] | None:
        raw = self._get(KEY_NEWS)
        if not raw:
            return None
        try:
            data = json.loads(raw)
            return [NewsArticle.model_validate(item) for item in data]
        except Exception as exc:
            logger.warning("market_store.news_parse_failed", error=str(exc))
            return None

    def set_news_articles(self, articles: list[NewsArticle]) -> None:
        cfg = get_settings()
        raw = json.dumps([a.model_dump(mode="json") for a in articles])
        self._set(KEY_NEWS, raw, cfg.news_cache_ttl_seconds)

    # ── Pre-computed aggregates (1 hour) ──────────────────────────────────────

    def get_aggregates(self) -> PrecomputedAggregates | None:
        raw = self._get(KEY_AGGREGATES)
        if not raw:
            return None
        try:
            return PrecomputedAggregates.model_validate_json(raw)
        except Exception as exc:
            logger.warning("market_store.aggregates_parse_failed", error=str(exc))
            return None

    def set_aggregates(self, aggregates: PrecomputedAggregates) -> None:
        cfg = get_settings()
        self._set(KEY_AGGREGATES, aggregates.model_dump_json(), cfg.aggregates_cache_ttl_seconds)

    def get_symbol_volatility(self, symbol: str) -> float | None:
        vols = self.get_volatility_map()
        return vols.get(symbol.upper())

    def get_volatility_map(self) -> dict[str, float]:
        raw = self._get(KEY_VOLATILITY)
        if raw:
            try:
                return {k.upper(): float(v) for k, v in json.loads(raw).items()}
            except Exception:
                pass
        agg = self.get_aggregates()
        return agg.symbol_volatility_90d if agg else {}

    def set_volatility_map(self, vols: dict[str, float]) -> None:
        cfg = get_settings()
        self._set(
            KEY_VOLATILITY,
            json.dumps({k.upper(): v for k, v in vols.items()}),
            cfg.aggregates_cache_ttl_seconds,
        )

    def get_risk_free_rate(self) -> float:
        manifest = self.get_manifest()
        if manifest:
            return manifest.risk_free_rate
        agg = self.get_aggregates()
        if agg:
            return agg.risk_free_rate
        return get_settings().risk_free_rate

    # ── Manifest (24 hours) ─────────────────────────────────────────────────

    def get_manifest(self) -> DataManifest | None:
        raw = self._get(KEY_MANIFEST)
        if not raw:
            return None
        try:
            return DataManifest.model_validate_json(raw)
        except Exception as exc:
            logger.warning("market_store.manifest_parse_failed", error=str(exc))
            return None

    def set_manifest(self, manifest: DataManifest) -> None:
        cfg = get_settings()
        self._set(KEY_MANIFEST, manifest.model_dump_json(), cfg.manifest_cache_ttl_seconds)

    def require_ready(self) -> None:
        """Raise if bootstrap has not populated the store."""
        if not self.get_market_snapshot():
            raise RuntimeError(
                "Market data not ready. Wait for application bootstrap to complete."
            )
