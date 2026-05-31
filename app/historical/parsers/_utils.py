"""Numeric parsing helpers for historical file parsers."""

from __future__ import annotations

import re

_FLOAT_RE = re.compile(r"[^\d.\-eE+]")

def parse_float(value: object, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, float) and value != value:  # NaN
        return default
    if isinstance(value, (int, float)):
        return float(value)
    text = _FLOAT_RE.sub("", str(value).strip().replace(",", ""))
    if not text or text in {".", "-", "-."}:
        return default
    try:
        return float(text)
    except ValueError:
        return default


def parse_int(value: object, default: int = 0) -> int:
    return int(parse_float(value, float(default)))
