"""PSX market facade — runtime reads from MarketDataStore only."""

from __future__ import annotations

from app.data.store import MarketDataStore
from app.logger import get_logger
from app.models import MarketSnapshot, StockQuote

logger = get_logger(__name__)


class PSXScraper:
    """
    Runtime facade: returns bootstrap-cached market data from Redis / memory.

    Live PSX HTTP calls happen only during ``app.bootstrap.startup`` and the
    optional background refresh task — never during user requests.
    """

    async def scrape(self) -> MarketSnapshot:
        store = MarketDataStore.get_instance()
        snapshot = store.get_market_snapshot()
        if snapshot:
            return snapshot
        store.require_ready()
        return store.get_market_snapshot()  # type: ignore[return-value]

    async def get_top_movers(self, n: int = 20) -> dict[str, list[StockQuote]]:
        store = MarketDataStore.get_instance()
        agg = store.get_aggregates()
        if agg:
            gainers = [
                StockQuote(symbol=m.symbol, company_name=m.company_name, sector=m.sector,
                           current_price=m.current_price, change_pct=m.change_pct, volume=m.volume)
                for m in sorted(agg.top_movers_by_change_pct, key=lambda x: x.change_pct, reverse=True)[:n]
            ]
            losers = [
                StockQuote(symbol=m.symbol, company_name=m.company_name, sector=m.sector,
                           current_price=m.current_price, change_pct=m.change_pct, volume=m.volume)
                for m in sorted(agg.top_movers_by_change_pct, key=lambda x: x.change_pct)[:n]
            ]
            return {"top_gainers": gainers, "top_losers": losers}

        snap = await self.scrape()
        sorted_by_change = sorted(snap.quotes, key=lambda q: q.change_pct)
        return {
            "top_gainers": list(reversed(sorted_by_change))[:n],
            "top_losers": sorted_by_change[:n],
        }

    # Kept for offline unit tests
    @staticmethod
    def parse_snapshot_from_html(html: str) -> MarketSnapshot:
        from app.scrapers.corporate_scraper import CorporateScraper
        from app.scrapers.market_scraper import MarketScraper

        market = MarketScraper()
        corporate = CorporateScraper()
        indices, board_stats = corporate.parse_indices_and_board_stats(html)
        from app.scrapers.snapshot_assembly import apply_corporate_data

        market = MarketScraper()
        corporate = CorporateScraper()
        indices, board_stats = corporate.parse_indices_and_board_stats(html)
        snap = MarketSnapshot(
            quotes=market.parse_equities_table(html),
            indices=indices,
            board_stats=board_stats,
        )
        apply_corporate_data(
            snap,
            {"indices": indices, "board_stats": board_stats, "futures": []},
        )
        return snap
