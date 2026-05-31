"""Trading-day calendar helpers (weekends, backfill windows)."""

from __future__ import annotations

from datetime import date, timedelta


def is_weekend(d: date) -> bool:
    return d.weekday() >= 5


def iter_calendar_days(start: date, end: date):
    """Yield every calendar day from start through end inclusive."""
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def iter_trading_day_candidates(start: date, end: date):
    """Yield weekdays in [start, end]; holidays are detected at download time."""
    for d in iter_calendar_days(start, end):
        if not is_weekend(d):
            yield d


def trading_days_back(from_date: date, count: int) -> list[date]:
    """Return the last `count` weekday dates strictly before from_date."""
    days: list[date] = []
    cursor = from_date - timedelta(days=1)
    while len(days) < count:
        if not is_weekend(cursor):
            days.append(cursor)
        cursor -= timedelta(days=1)
    days.reverse()
    return days


def trading_days_window(end: date, count: int) -> list[date]:
    """Return up to `count` weekdays ending on ``end`` inclusive."""
    days: list[date] = []
    cursor = end
    while len(days) < count:
        if not is_weekend(cursor):
            days.append(cursor)
        cursor -= timedelta(days=1)
    days.reverse()
    return days
