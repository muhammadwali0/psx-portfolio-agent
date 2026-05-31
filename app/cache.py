"""Backward-compatible cache facade — delegates to MarketDataStore."""

from __future__ import annotations

from app.data.store import MarketDataStore
from app.models import MarketSnapshot, NewsArticle


class RedisCache:
    """Legacy name; all reads/writes go through MarketDataStore."""

    _instance: RedisCache | None = None

    def __init__(self, redis_url: str | None = None) -> None:
        self._store = MarketDataStore(redis_url) if redis_url is not None else MarketDataStore.get_instance()

    @classmethod
    def get_instance(cls) -> RedisCache:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_market_snapshot(self) -> MarketSnapshot | None:
        return self._store.get_market_snapshot()

    def set_market_snapshot(self, snapshot: MarketSnapshot) -> None:
        self._store.set_market_snapshot(snapshot)

    def get_news_articles(self) -> list[NewsArticle] | None:
        return self._store.get_news_articles()

    def set_news_articles(self, articles: list[NewsArticle]) -> None:
        self._store.set_news_articles(articles)
