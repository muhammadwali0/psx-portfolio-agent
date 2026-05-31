"""SQLite persistence for PSX daily downloads."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import date
from pathlib import Path
from typing import Any, Iterator

from app.config import get_settings
from app.logger import get_logger

logger = get_logger(__name__)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS daily_ohlcv (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume INTEGER NOT NULL,
    value REAL NOT NULL,
    PRIMARY KEY (symbol, date)
);

CREATE TABLE IF NOT EXISTS index_constituents (
    index_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    weight REAL NOT NULL,
    date TEXT NOT NULL,
    PRIMARY KEY (index_name, symbol, date)
);

CREATE TABLE IF NOT EXISTS gis_rates (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    revaluation_rate REAL NOT NULL,
    PRIMARY KEY (symbol, date)
);

CREATE TABLE IF NOT EXISTS futures_open_interest (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    open_interest INTEGER NOT NULL,
    PRIMARY KEY (symbol, date)
);

CREATE TABLE IF NOT EXISTS off_market_transactions (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    value REAL NOT NULL,
    volume INTEGER NOT NULL,
    PRIMARY KEY (symbol, date, value, volume)
);

CREATE TABLE IF NOT EXISTS ingest_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_date ON daily_ohlcv(symbol, date);
CREATE INDEX IF NOT EXISTS idx_index_const_index_date ON index_constituents(index_name, date);
CREATE INDEX IF NOT EXISTS idx_gis_symbol_date ON gis_rates(symbol, date);
CREATE INDEX IF NOT EXISTS idx_futures_symbol_date ON futures_open_interest(symbol, date);
"""


def _iso(d: date) -> str:
    return d.isoformat()


class HistoricalDatabase:
    """Thin SQLite wrapper with idempotent inserts."""

    def __init__(self, path: str | Path | None = None) -> None:
        cfg = get_settings()
        self.path = Path(path or cfg.historical_db_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def initialize(self) -> None:
        with self.connect() as conn:
            conn.executescript(SCHEMA_SQL)

    def get_meta(self, key: str) -> str | None:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT value FROM ingest_meta WHERE key = ?", (key,)
            ).fetchone()
        return row["value"] if row else None

    def set_meta(self, key: str, value: str) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO ingest_meta (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (key, value),
            )

    def insert_ohlcv(self, rows: list[dict[str, Any]]) -> int:
        if not rows:
            return 0
        with self.connect() as conn:
            before = conn.total_changes
            conn.executemany(
                """
                INSERT OR IGNORE INTO daily_ohlcv
                (symbol, date, open, high, low, close, volume, value)
                VALUES (:symbol, :date, :open, :high, :low, :close, :volume, :value)
                """,
                rows,
            )
            return conn.total_changes - before

    def insert_index_constituents(self, rows: list[dict[str, Any]]) -> int:
        if not rows:
            return 0
        with self.connect() as conn:
            before = conn.total_changes
            conn.executemany(
                """
                INSERT OR IGNORE INTO index_constituents
                (index_name, symbol, weight, date)
                VALUES (:index_name, :symbol, :weight, :date)
                """,
                rows,
            )
            return conn.total_changes - before

    def insert_gis_rates(self, rows: list[dict[str, Any]]) -> int:
        if not rows:
            return 0
        with self.connect() as conn:
            before = conn.total_changes
            conn.executemany(
                """
                INSERT OR IGNORE INTO gis_rates (symbol, date, revaluation_rate)
                VALUES (:symbol, :date, :revaluation_rate)
                """,
                rows,
            )
            return conn.total_changes - before

    def insert_futures_oi(self, rows: list[dict[str, Any]]) -> int:
        if not rows:
            return 0
        with self.connect() as conn:
            before = conn.total_changes
            conn.executemany(
                """
                INSERT OR IGNORE INTO futures_open_interest
                (symbol, date, open_interest)
                VALUES (:symbol, :date, :open_interest)
                """,
                rows,
            )
            return conn.total_changes - before

    def insert_off_market(self, rows: list[dict[str, Any]]) -> int:
        if not rows:
            return 0
        with self.connect() as conn:
            before = conn.total_changes
            conn.executemany(
                """
                INSERT OR IGNORE INTO off_market_transactions
                (symbol, date, value, volume)
                VALUES (:symbol, :date, :value, :volume)
                """,
                rows,
            )
            return conn.total_changes - before

    @staticmethod
    def row_date(d: date) -> str:
        return _iso(d)
