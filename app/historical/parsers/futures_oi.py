"""Parse PSX fut_opn_int.xls open-interest workbook."""

from __future__ import annotations

from datetime import date
from io import BytesIO
from typing import Any

import pandas as pd

from app.historical.parsers._utils import parse_int


def _pick_data_sheet(book: pd.ExcelFile) -> str:
    for name in book.sheet_names:
        if name.lower() != "sheet1" and "opn_int" in name.lower():
            return name
    return book.sheet_names[-1]


def parse_futures_open_interest(raw_xls: bytes, trade_date: date) -> list[dict[str, Any]]:
    iso = trade_date.isoformat()
    book = pd.ExcelFile(BytesIO(raw_xls), engine="xlrd")
    sheet = _pick_data_sheet(book)
    df = pd.read_excel(book, sheet_name=sheet, header=None, engine="xlrd")

    rows: list[dict[str, Any]] = []
    for i in range(len(df)):
        row = df.iloc[i]
        first = row.iloc[0] if len(row) > 0 else None
        if first is None or str(first).strip().lower() in {"", "nan", "sr", "no"}:
            continue
        sr = parse_int(first)
        if sr <= 0:
            continue
        symbol = str(row.iloc[1]).strip().upper() if len(row) > 1 else ""
        oi = parse_int(row.iloc[3]) if len(row) > 3 else 0
        if not symbol or symbol in {"SYMBOL", "NAN", "CATEGORY"} or oi <= 0:
            continue
        rows.append({"symbol": symbol, "date": iso, "open_interest": oi})
    return rows
