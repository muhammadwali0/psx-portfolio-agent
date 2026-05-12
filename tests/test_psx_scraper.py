"""Tests for PSXScraper."""

from __future__ import annotations

import pytest

from app.models import MarketSnapshot
from app.scrapers.psx_scraper import PSXScraper


# Minimal HTML fixture that mimics PSX equities table structure
_SAMPLE_HTML = """
<html><body>
  <section>
    <span>KSE-100</span>
    <div>75,250.50 +350.25</div>
    <span>Advances</span><span>180</span>
    <span>Declines</span><span>120</span>
    <span>Unchanged</span><span>45</span>
  </section>
  <table>
    <thead>
      <tr>
        <th>Symbol</th><th>Company</th><th>Sector</th>
        <th>Current</th><th>Open</th><th>High</th>
        <th>Low</th><th>LDCP</th><th>Volume</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>ENGRO</td><td>Engro Corp</td><td>Fertilizer</td>
        <td>285.50</td><td>280.00</td><td>290.00</td>
        <td>278.00</td><td>280.00</td><td>1,500,000</td>
      </tr>
      <tr>
        <td>HBL</td><td>Habib Bank</td><td>Banking</td>
        <td>155.25</td><td>153.00</td><td>158.00</td>
        <td>152.00</td><td>153.00</td><td>3,200,000</td>
      </tr>
      <tr>
        <td>bad row</td>
      </tr>
    </tbody>
  </table>
</body></html>
"""


def test_parse_snapshot_from_html():
    snap = PSXScraper.parse_snapshot_from_html(_SAMPLE_HTML)
    assert isinstance(snap, MarketSnapshot)
    # Two valid rows, one bad row ignored
    assert len(snap.quotes) == 2


def test_quote_symbols_are_uppercase():
    snap = PSXScraper.parse_snapshot_from_html(_SAMPLE_HTML)
    for q in snap.quotes:
        assert q.symbol == q.symbol.upper()


def test_quote_change_computed():
    snap = PSXScraper.parse_snapshot_from_html(_SAMPLE_HTML)
    engro = next(q for q in snap.quotes if q.symbol == "ENGRO")
    assert engro.change == pytest.approx(5.50, abs=0.01)
    assert engro.change_pct == pytest.approx(1.964, abs=0.01)


def test_parse_handles_empty_html():
    snap = PSXScraper.parse_snapshot_from_html("<html></html>")
    assert snap.quotes == []
    assert snap.kse100_index == 0.0


def test_parse_ignores_non_ticker_rows():
    html = """
    <table><tbody>
      <tr><td>123NOTICK</td><td>Bad</td><td>Sec</td>
          <td>10.0</td><td>10.0</td><td>10.0</td>
          <td>10.0</td><td>10.0</td><td>1000</td></tr>
    </tbody></table>
    """
    snap = PSXScraper.parse_snapshot_from_html(html)
    assert snap.quotes == []
