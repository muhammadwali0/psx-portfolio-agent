"""Parse PSX reval_rates_gis.csv."""

from __future__ import annotations

import csv
from datetime import date, datetime
from io import StringIO
from typing import Any

from app.historical.parsers._utils import parse_float


def _parse_published_date(token: str, fallback: date) -> date:
    token = (token or "").strip()
    for fmt in ("%Y-%m-%d", "%d-%b-%y", "%d-%b-%Y"):
        try:
            return datetime.strptime(token, fmt).date()
        except ValueError:
            continue
    return fallback


def parse_gis_revaluation_rates(raw_csv: bytes, trade_date: date) -> list[dict[str, Any]]:
    text = raw_csv.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(StringIO(text))
    if not reader.fieldnames:
        return []

    rate_columns = [
        c for c in reader.fieldnames if c and c.strip().lower() not in {"bond code", "maturity date", "published date"}
    ]
    rows: list[dict[str, Any]] = []

    for record in reader:
        symbol = (record.get("Bond Code") or record.get("bond code") or "").strip().upper()
        if not symbol:
            continue
        published = _parse_published_date(
            record.get("Published Date") or record.get("published date") or "",
            trade_date,
        )
        rates = [parse_float(record.get(col)) for col in rate_columns if record.get(col)]
        rates = [r for r in rates if r > 0]
        if not rates:
            continue
        rows.append(
            {
                "symbol": symbol,
                "date": published.isoformat(),
                "revaluation_rate": round(sum(rates) / len(rates), 4),
            }
        )
    return rows
