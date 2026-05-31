"""Parse PSX mkt_summary (closing11.lis) pipe-delimited OHLCV."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from app.historical.decompress import decompress_psx_z
from app.historical.parsers._utils import parse_float, parse_int

# Market-type code 40 = deliverable futures rows in the summary file.
_FUTURES_MARKET_CODE = "40"


def _parse_row_date(token: str, fallback: date) -> date:
    token = token.strip()
    if not token:
        return fallback
    for fmt in ("%d%b%Y", "%d-%b-%y", "%d-%b-%Y"):
        try:
            return datetime.strptime(token.upper(), fmt).date()
        except ValueError:
            continue
    return fallback


def parse_mkt_summary(raw_z: bytes, trade_date: date) -> list[dict[str, Any]]:
    """Return OHLCV rows for regular equities (excludes DFC contract lines)."""
    text = decompress_psx_z(raw_z).decode("latin-1", errors="replace")
    rows: list[dict[str, Any]] = []
    iso = trade_date.isoformat()

    for line in text.splitlines():
        line = line.strip()
        if not line or "|" not in line:
            continue
        parts = line.split("|")
        if len(parts) < 9:
            continue

        symbol = parts[1].strip().upper()
        if not symbol or parts[2].strip() == _FUTURES_MARKET_CODE:
            continue

        row_date = _parse_row_date(parts[0], trade_date)
        open_p = parse_float(parts[4])
        high_p = parse_float(parts[5])
        low_p = parse_float(parts[6])
        close_p = parse_float(parts[7])
        volume = parse_int(parts[8])
        if close_p <= 0:
            continue

        rows.append(
            {
                "symbol": symbol,
                "date": row_date.isoformat() if row_date != trade_date else iso,
                "open": open_p,
                "high": high_p,
                "low": low_p,
                "close": close_p,
                "volume": volume,
                "value": round(close_p * volume, 2),
            }
        )
    return rows
