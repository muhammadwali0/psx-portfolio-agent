"""Tests for focused PSX scraper parsers and facade assembly."""

from __future__ import annotations

import pytest

from app.models import (
    BoardStats,
    FuturesContract,
    GISMetrics,
    IndexSnapshot,
    MarketSnapshot,
)
from app.scrapers.corporate_scraper import CorporateScraper
from app.scrapers.gis_scraper import GISScraper
from app.scrapers.market_scraper import MarketScraper
from app.scrapers.psx_scraper import PSXScraper

_EQUITIES_HTML = """
<table>
  <thead>
    <tr>
      <th>Symbol</th><th>Company</th><th>Sector</th><th>Current</th>
      <th>Open</th><th>High</th><th>Low</th><th>LDCP</th><th>Volume</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>ENGRO</td><td>Engro Corp</td><td>Fertilizer</td><td>285.50</td>
      <td>280</td><td>290</td><td>278</td><td>280</td><td>1,500,000</td>
    </tr>
  </tbody>
</table>
"""

_SUMMARY_HTML = """
<div class="row">
  <div>Volume 610,220,321 Value 44,037,126,649 Advanced 238 Declined 154 Unchanged 23 Total 415</div>
  <div class="col-xs-6"><span>KSE-100</span><h4>75,250.50</h4></div>
  <div class="col-xs-6"><h5 class="up">350.25</h5><h6>(0.47%)</h6></div>
</div>
"""

_FUTURES_HTML = """
<table><tbody>
  <tr>
    <td>ENGRO-JUN</td><td>280.00</td><td>290.00</td><td>278.00</td>
    <td>285.50</td><td>5.50</td><td>10,000</td>
  </tr>
</tbody></table>
"""

_GIS_HTML = """
<table>
  <thead>
    <tr>
      <th>Symbol</th><th>Name</th><th>Sector</th><th>Current</th>
      <th>Open</th><th>High</th><th>Low</th><th>LDCP</th><th>Volume</th><th>Yield</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>P01GHS130527</td><td></td><td>BILLS AND BONDS</td><td>101.25</td>
      <td>101.00</td><td>101.50</td><td>100.90</td><td>100.75</td><td>50,000</td><td>14.25</td>
    </tr>
    <tr>
      <td>NOTGIS</td><td>Other Bond</td><td>BILLS AND BONDS</td><td>100</td>
      <td>100</td><td>100</td><td>100</td><td>100</td><td>1</td><td>10</td>
    </tr>
  </tbody>
</table>
"""


def test_market_scraper_parses_equities_table():
    quotes = MarketScraper().parse_equities_table(_EQUITIES_HTML)

    assert len(quotes) == 1
    assert quotes[0].symbol == "ENGRO"
    assert quotes[0].volume == 1_500_000


def test_corporate_scraper_parses_indices_board_stats_and_futures():
    scraper = CorporateScraper()

    indices, board_stats = scraper.parse_indices_and_board_stats(_SUMMARY_HTML)
    futures = scraper.parse_futures_html(_FUTURES_HTML)

    assert indices[0].symbol == "KSE100"
    assert indices[0].current_value == pytest.approx(75_250.50)
    assert indices[0].change == pytest.approx(350.25)
    assert indices[0].change_pct == pytest.approx(0.47)
    assert board_stats.advances == 238
    assert board_stats.declines == 154
    assert board_stats.unchanged == 23
    assert board_stats.total_volume == 610_220_321
    assert board_stats.total_value_mn == pytest.approx(44_037.126649)
    assert len(futures) == 1
    assert futures[0].symbol == "ENGRO-JUN"
    assert futures[0].current_price == pytest.approx(285.50)
    assert futures[0].change_pct == pytest.approx(1.9642857142857142)
    assert futures[0].volume == 10_000


def test_gis_scraper_parses_symbols_and_debt_table():
    scraper = GISScraper()
    symbols = scraper.parse_symbols(
        [{"symbol": "P01GHS130527", "name": "GIS Fixed Rental 13-May-2027"}]
    )

    metrics = scraper.parse_debt_table(_GIS_HTML, symbols)

    assert len(metrics) == 1
    assert metrics[0].symbol == "P01GHS130527"
    assert metrics[0].name == "GIS Fixed Rental 13-May-2027"
    assert metrics[0].current_price == pytest.approx(101.25)
    assert metrics[0].prev_close == pytest.approx(100.75)
    assert metrics[0].volume == 50_000
    assert metrics[0].yield_pct == pytest.approx(14.25)


@pytest.mark.asyncio
async def test_psx_scraper_reads_cached_snapshot(sample_snapshot):
    from app.data.store import MarketDataStore

    store = MarketDataStore()
    MarketDataStore._instance = store
    sample_snapshot.kse100_index = 75_250.50
    sample_snapshot.advances = 180
    store.set_market_snapshot(sample_snapshot)

    snapshot = await PSXScraper().scrape()

    assert isinstance(snapshot, MarketSnapshot)
    assert len(snapshot.quotes) == 1
    assert snapshot.kse100_index == pytest.approx(75_000.0)
    MarketDataStore.reset_instance()
