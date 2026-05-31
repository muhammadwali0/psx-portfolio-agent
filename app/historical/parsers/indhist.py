"""Parse PSX indhist.xls index constituent sheets."""

from __future__ import annotations

from datetime import date
from io import BytesIO
from typing import Any

import pandas as pd

from app.historical.parsers._utils import parse_float

# Sheets that are indices with SYMBOL / IDX WT % columns.
_INDEX_SHEETS = {
    "KSE-100",
    "KSE-30",
    "KSE-ALL-Shares",
    "PSX-KMI-ALL-Shares",
    "KMI-30",
    "PSXDIV20",
    "MII30",
    "OGTi",
    "BKTi",
    "UPP9",
    "NITPGI",
    "NBPPGI",
    "MZNPI",
    "JSMFI",
    "ACI",
    "JSGBKTI",
}


def parse_index_constituents(raw_xls: bytes, trade_date: date) -> list[dict[str, Any]]:
    iso = trade_date.isoformat()
    rows: list[dict[str, Any]] = []
    book = pd.ExcelFile(BytesIO(raw_xls), engine="xlrd")

    for sheet in book.sheet_names:
        if sheet not in _INDEX_SHEETS:
            continue
        df = pd.read_excel(book, sheet_name=sheet, header=0, engine="xlrd")
        cols = {str(c).strip().upper(): c for c in df.columns}
        sym_col = cols.get("SYMBOL")
        wt_col = cols.get("IDX WT %") or cols.get("IDX WT%")
        if sym_col is None or wt_col is None:
            continue

        for _, row in df.iterrows():
            symbol = str(row[sym_col]).strip().upper()
            weight = parse_float(row[wt_col])
            if not symbol or symbol == "NAN" or weight <= 0:
                continue
            rows.append(
                {
                    "index_name": sheet,
                    "symbol": symbol,
                    "weight": weight,
                    "date": iso,
                }
            )
    return rows
