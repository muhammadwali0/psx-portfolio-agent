"""Shariah-compliant universe filtering (KMI30 / PSX-KMI-ALL-Shares)."""

from __future__ import annotations

import re

from app.historical.db import HistoricalDatabase
from app.logger import get_logger
from app.models import GISMetrics, MarketSnapshot

logger = get_logger(__name__)

# SQLite index_name values from PSX indhist.xls sheets
KMI30_INDEX = "KMI-30"
KMI_ALL_INDEX = "PSX-KMI-ALL-Shares"
SHARIAH_INDEX_NAMES = (KMI30_INDEX, KMI_ALL_INDEX)

# Fallback when index_constituents has no KMI rows (May 2025 KMI-30 constituents)
FALLBACK_KMI30_SYMBOLS: frozenset[str] = frozenset(
    {
        "AIRLINK", "ATRL", "DGKC", "EFERT", "ENGROH", "EPCL", "FABL", "FCCL", "FFL",
        "GHNI", "HCAR", "HUBC", "KEL", "LUCK", "MARI", "MEBL", "MLCF", "MTL", "NRL",
        "OGDC", "PAEL", "PIOC", "PPL", "PRL", "PSO", "SAZEW", "SEARL", "SNGP", "SYS",
        "UNITY",
    }
)

# Deliverable futures, conventional bonds, MTS-style debt tickers (not GIS Sukuk)
_EXCLUDED_SYMBOL_RE = re.compile(
    r"(-[A-Z]{2,5}$)|^(P\d{2}[A-Z]{3}|TFC|BFB|KASB|SUKUK)",
    re.IGNORECASE,
)


class ShariahFilter:
    """Filter PSX instruments to Shariah-compliant KMI index constituents."""

    def __init__(self, db: HistoricalDatabase | None = None) -> None:
        self._db = db or HistoricalDatabase()
        self._universe: frozenset[str] | None = None

    def get_universe(self) -> frozenset[str]:
        if self._universe is not None:
            return self._universe

        symbols: set[str] = set()
        with self._db.connect() as conn:
            for index_name in SHARIAH_INDEX_NAMES:
                row = conn.execute(
                    """
                    SELECT MAX(date) AS d FROM index_constituents
                    WHERE index_name = ?
                    """,
                    (index_name,),
                ).fetchone()
                if not row or not row["d"]:
                    continue
                rows = conn.execute(
                    """
                    SELECT DISTINCT symbol FROM index_constituents
                    WHERE index_name = ? AND date = ?
                    """,
                    (index_name, row["d"]),
                ).fetchall()
                symbols.update(r["symbol"].upper() for r in rows)

        if not symbols:
            logger.warning("shariah.no_sqlite_constituents", fallback=len(FALLBACK_KMI30_SYMBOLS))
            symbols = set(FALLBACK_KMI30_SYMBOLS)
        else:
            logger.info("shariah.universe_loaded", count=len(symbols))

        self._universe = frozenset(symbols)
        return self._universe

    def is_compliant_equity(self, symbol: str) -> bool:
        sym = symbol.upper().strip()
        if not sym or self.is_excluded_instrument(sym):
            return False
        return sym in self.get_universe()

    @staticmethod
    def is_excluded_instrument(symbol: str) -> bool:
        """Exclude futures, conventional bonds, and MTS/leveraged tickers."""
        sym = symbol.upper().strip()
        if not sym:
            return True
        if _EXCLUDED_SYMBOL_RE.search(sym):
            return True
        if sym.endswith(("TFC", "BOND", "DEBT")):
            return True
        return False

    @staticmethod
    def is_gis_sukuk(symbol: str, gis_symbols: set[str] | frozenset[str]) -> bool:
        return symbol.upper() in gis_symbols

    def filter_equity_symbols(self, symbols: list[str]) -> list[str]:
        return [s for s in symbols if self.is_compliant_equity(s)]

    @staticmethod
    def gis_instruments(snapshot: MarketSnapshot) -> list[GISMetrics]:
        """GIS Sukuk instruments from the live snapshot (Shariah fixed-income sleeve)."""
        return list(snapshot.gis or [])

    @staticmethod
    def gis_symbol_set(snapshot: MarketSnapshot) -> frozenset[str]:
        return frozenset(g.symbol.upper() for g in snapshot.gis if g.symbol)

    def allowed_tickers_for_prompt(self, snapshot: MarketSnapshot) -> list[str]:
        """Equity universe + GIS Sukuk symbols for Gemini candidate list."""
        equities = sorted(self.get_universe())
        gis = sorted(self.gis_symbol_set(snapshot))
        return equities + gis
