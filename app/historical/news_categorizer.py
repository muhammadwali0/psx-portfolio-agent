"""Rule-based news categorizer and keyword extractor for PSX news articles."""

from __future__ import annotations

import re

CATEGORIES = ("geopolitical", "macro", "sector", "global", "corporate")

_GEO_POLITICAL = (
    "india",
    "pakistan tensions",
    "border",
    "military",
    "war",
    "sanctions",
    "diplomatic",
    "cpec",
    "china pakistan",
    "imf",
    "fatf",
    "world bank",
    "asian development bank",
    "un ",
    "united nations",
    "g20",
    "biden",
    "trump",
    "modi",
)

_MACRO = (
    "sbp",
    "state bank",
    "policy rate",
    "interest rate",
    "inflation",
    "cpi",
    "pkr",
    "rupee",
    "exchange rate",
    "current account",
    "trade deficit",
    "fiscal deficit",
    "budget",
    "taxation",
    "fbr",
    "revenue",
    "gdp",
    "remittances",
    "foreign reserves",
    "imf tranche",
    "eurobond",
    "sukuk bond issuance",
)

_SECTOR = (
    "cement sector",
    "banking sector",
    "fertilizer",
    "power sector",
    "energy sector",
    "oil and gas",
    "textile",
    "pharma",
    "telecom",
    "auto sector",
    "steel",
    "sugar sector",
    "circular debt",
    "gas tariff",
    "electricity tariff",
    "ogra",
    "nepra",
    "nic",
    "secp",
)

_GLOBAL = (
    "federal reserve",
    "fed rate",
    "us economy",
    "oil price",
    "brent crude",
    "opec",
    "global markets",
    "nasdaq",
    "s&p 500",
    "dow jones",
    "emerging markets",
    "world economy",
    "dollar index",
)

_STOPWORDS = frozenset(
    {
        "a",
        "an",
        "the",
        "and",
        "or",
        "but",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "with",
        "by",
        "from",
        "is",
        "was",
        "are",
        "were",
        "be",
        "been",
        "has",
        "have",
        "had",
        "will",
        "would",
        "its",
        "this",
        "that",
        "as",
        "up",
        "down",
    }
)

_CATEGORY_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("geopolitical", _GEO_POLITICAL),
    ("macro", _MACRO),
    ("sector", _SECTOR),
    ("global", _GLOBAL),
)


def categorize(title: str, summary: str = "") -> str:
    """Return category string; first matching rule wins, else corporate."""
    text = f"{title} {summary}".lower()
    for category, keywords in _CATEGORY_RULES:
        if any(kw in text for kw in keywords):
            return category
    return "corporate"


def extract_keywords(title: str, summary: str = "", *, max_keywords: int = 20) -> list[str]:
    """Extract significant terms from title + summary."""
    combined = f"{title} {summary}"
    tokens = re.findall(r"[A-Za-z0-9&]+", combined)
    seen: set[str] = set()
    keywords: list[str] = []

    for raw in tokens:
        if raw.isupper() and len(raw) >= 2:
            term = raw.lower()
        else:
            term = raw.lower()
            if term in _STOPWORDS:
                continue
            if len(term) < 5:
                continue
        if term in seen:
            continue
        seen.add(term)
        keywords.append(term)
        if len(keywords) >= max_keywords:
            break

    return keywords
