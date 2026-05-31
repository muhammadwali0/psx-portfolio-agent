"""Decompress PSX .Z daily files (ZIP-wrapped or Unix LZW)."""

from __future__ import annotations

import io
import zipfile

import unlzw3


def decompress_psx_z(raw: bytes) -> bytes:
    """
    PSX ``mkt_summary`` files use a ``.Z`` extension but are often ZIP archives
    containing ``closing11.lis``. Older archives may be true Unix compress (LZW).
    """
    if raw[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            names = [n for n in zf.namelist() if not n.endswith("/")]
            if not names:
                raise ValueError("ZIP archive has no files")
            return zf.read(names[0])
    if raw[:2] in (b"\x1f\x9d", b"\x1f\xa0"):
        text = unlzw3.unlzw(raw)
        return text.encode("latin-1") if isinstance(text, str) else text
    return raw
