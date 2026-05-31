"""Parse PSX omts.csv off-market transactions."""

from __future__ import annotations

import csv
import re
from datetime import date, datetime
from io import StringIO
from typing import Any

from app.historical.parsers._utils import parse_float, parse_int

_DATE_RE = re.compile(r"^\d{1,2}-[A-Za-z]{3}-\d{2,4}$")


def _parse_omts_date(token: str, fallback: date) -> date:
    token = token.strip()
    for fmt in ("%d-%b-%y", "%d-%b-%Y"):
        try:
            return datetime.strptime(token, fmt).date()
        except ValueError:
            continue
    return fallback


def parse_off_market_transactions(raw_csv: bytes, trade_date: date) -> list[dict[str, Any]]:
    text = raw_csv.decode("utf-8-sig", errors="replace")
    rows: list[dict[str, Any]] = []

    for line in text.splitlines():
        line = line.strip()
        if not line or not _DATE_RE.match(line.split(",")[0].strip()):
            continue
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 8:
            continue
        symbol = parts[3].upper()
        volume = parse_int(parts[5])
        value = parse_float(parts[7])
        if not symbol or volume <= 0:
            continue
        row_date = _parse_omts_date(parts[0], trade_date)
        rows.append(
            {
                "symbol": symbol,
                "date": row_date.isoformat(),
                "volume": volume,
                "value": value,
            }
        )
    return rows
