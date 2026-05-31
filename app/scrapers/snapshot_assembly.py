"""Merge focused scraper outputs into a MarketSnapshot."""

from __future__ import annotations

from typing import Any

from app.models import MarketSnapshot


def apply_corporate_data(snapshot: MarketSnapshot, data: dict[str, Any]) -> None:
    """Merge corporate scraper output (indices, board stats, futures) into snapshot."""
    snapshot.indices = data.get("indices", [])
    snapshot.board_stats = data.get("board_stats")
    snapshot.futures = data.get("futures", [])

    if snapshot.board_stats:
        snapshot.advances = snapshot.board_stats.advances
        snapshot.declines = snapshot.board_stats.declines
        snapshot.unchanged = snapshot.board_stats.unchanged
        snapshot.total_volume = snapshot.board_stats.total_volume
        snapshot.total_value_mn = snapshot.board_stats.total_value_mn

    for index in snapshot.indices:
        if index.symbol.upper() == "KSE100":
            snapshot.kse100_index = index.current_value
            snapshot.kse100_change = index.change
            snapshot.kse100_change_pct = index.change_pct
        elif index.symbol.upper() == "KSE30":
            snapshot.kse30_index = index.current_value
