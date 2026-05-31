"""Tests for PSX historical download pipeline."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from app.historical.calendar import is_weekend, trading_days_window
from app.historical.db import HistoricalDatabase
from app.historical.decompress import decompress_psx_z
from app.historical.download import DailyDownloadService
from app.historical.parsers import (
    parse_futures_open_interest,
    parse_gis_revaluation_rates,
    parse_index_constituents,
    parse_mkt_summary,
    parse_off_market_transactions,
)
from app.historical.query import HistoricalDataService
from app.models import MarketSnapshot, StockQuote

FIXTURES = Path(__file__).parent / "fixtures" / "historical"
TRADE_DATE = date(2025, 5, 23)


@pytest.fixture
def db_path(tmp_path):
    return tmp_path / "test_history.db"


@pytest.fixture
def db(db_path):
    database = HistoricalDatabase(db_path)
    database.initialize()
    return database


def test_is_weekend():
    assert is_weekend(date(2025, 5, 24))  # Saturday
    assert not is_weekend(date(2025, 5, 23))


def test_trading_days_window_count():
    days = trading_days_window(date(2025, 5, 23), 5)
    assert len(days) == 5
    assert all(not is_weekend(d) for d in days)


def test_decompress_mkt_summary_zip():
    raw = (FIXTURES / "mkt_summary_2025-05-23.Z").read_bytes()
    out = decompress_psx_z(raw)
    assert b"ENGRO" in out or b"ABL" in out


def test_parse_mkt_summary():
    raw = (FIXTURES / "mkt_summary_2025-05-23.Z").read_bytes()
    rows = parse_mkt_summary(raw, TRADE_DATE)
    assert len(rows) > 100
    abl = next(r for r in rows if r["symbol"] == "ABL")
    assert abl["close"] > 0
    assert abl["volume"] > 0
    assert abl["date"] == TRADE_DATE.isoformat()


def test_parse_gis_rates():
    raw = (FIXTURES / "reval_rates_gis_2025-05-23.csv").read_bytes()
    rows = parse_gis_revaluation_rates(raw, TRADE_DATE)
    assert len(rows) > 5
    assert rows[0]["revaluation_rate"] > 0


def test_parse_omts():
    raw = (FIXTURES / "omts_2025-05-23.csv").read_bytes()
    rows = parse_off_market_transactions(raw, TRADE_DATE)
    assert len(rows) >= 3
    assert any(r["symbol"] == "PSX" for r in rows)


@pytest.mark.skipif(
    not (FIXTURES / "indhist_2025-05-23.xls").exists(),
    reason="indhist fixture missing",
)
def test_parse_indhist():
    raw = (FIXTURES / "indhist_2025-05-23.xls").read_bytes()
    rows = parse_index_constituents(raw, TRADE_DATE)
    assert len(rows) > 50
    kse100 = [r for r in rows if r["index_name"] == "KSE-100"]
    assert any(r["symbol"] == "ABL" for r in kse100)


@pytest.mark.skipif(
    not (FIXTURES / "fut_opn_int.xls").exists(),
    reason="futures fixture missing",
)
def test_parse_futures_oi():
    raw = (FIXTURES / "fut_opn_int.xls").read_bytes()
    rows = parse_futures_open_interest(raw, TRADE_DATE)
    assert len(rows) > 5
    assert any("AGHA" in r["symbol"] for r in rows)


def test_db_insert_or_ignore_idempotent(db):
    rows = [
        {
            "symbol": "ABL",
            "date": TRADE_DATE.isoformat(),
            "open": 1.0,
            "high": 2.0,
            "low": 0.5,
            "close": 1.5,
            "volume": 100,
            "value": 150.0,
        }
    ]
    assert db.insert_ohlcv(rows) == 1
    assert db.insert_ohlcv(rows) == 0


def test_historical_service_moving_averages(db):
    for i in range(25):
        d = date(2025, 4, 1 + i)
        db.insert_ohlcv(
            [
                {
                    "symbol": "TEST",
                    "date": d.isoformat(),
                    "open": 100 + i,
                    "high": 101 + i,
                    "low": 99 + i,
                    "close": 100 + i,
                    "volume": 1000,
                    "value": 100000.0,
                }
            ]
        )
    svc = HistoricalDataService(db)
    mas = svc.moving_averages("TEST", as_of=date(2025, 4, 25))
    assert mas["ma20"] is not None
    assert mas["ma50"] is None


def test_enrich_snapshot(monkeypatch, db_path, db):
    raw = (FIXTURES / "mkt_summary_2025-05-23.Z").read_bytes()
    rows = parse_mkt_summary(raw, TRADE_DATE)
    db.insert_ohlcv(rows)

    from app.historical.enrich import enrich_snapshot_with_history

    snap = MarketSnapshot(
        quotes=[
            StockQuote(symbol="ABL", current_price=128.0, volume=1000),
            StockQuote(symbol="ENGRO", current_price=285.0, volume=1000),
        ]
    )
    enriched = enrich_snapshot_with_history(
        snap, service=HistoricalDataService(db)
    )
    assert enriched.historical is not None
    assert "ABL" in enriched.historical.by_symbol
    abl_ctx = enriched.historical.by_symbol["ABL"]
    assert len(abl_ctx.ohlcv_90d) >= 1
    assert abl_ctx.position_in_90d_range_pct is not None


def test_daily_download_ingest_day_with_fixtures(db_path, monkeypatch):
    db = HistoricalDatabase(db_path)
    svc = DailyDownloadService(db=db)

    def fake_download(self, trade_date: date):
        iso = trade_date.isoformat()
        payloads = {}
        mapping = {
            "mkt_summary": f"mkt_summary_{iso}.Z",
            "reval_rates_gis": f"reval_rates_gis_{iso}.csv",
            "omts": f"omts_{iso}.csv",
        }
        for key, fname in mapping.items():
            path = FIXTURES / fname
            if path.exists():
                payloads[key] = path.read_bytes()
        if (FIXTURES / f"indhist_{iso}.xls").exists():
            payloads["indhist"] = (FIXTURES / f"indhist_{iso}.xls").read_bytes()
        if (FIXTURES / "fut_opn_int.xls").exists():
            payloads["fut_opn_int"] = (FIXTURES / "fut_opn_int.xls").read_bytes()
        return payloads

    monkeypatch.setattr(DailyDownloadService, "_download_day", fake_download)
    result = svc.ingest_day(TRADE_DATE)
    assert "mkt_summary" in result.downloaded
    assert result.rows.get("daily_ohlcv", 0) > 0
