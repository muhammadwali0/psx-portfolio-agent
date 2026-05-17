# PSX Portfolio Construction Agent

> **AISeekho 2026 Google Antigravity Hackathon — Challenge 1: Autonomous Content-to-Action Agent**

An agentic system that scrapes live PSX market data and Pakistani financial news, detects and resolves conflicting signals, reasons with **Gemini 2.5 Pro**, and produces a fully justified investment portfolio with simulated execution.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FastAPI REST API                                │
│          /health  /portfolio/run  /market/snapshot  /news               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                    ActionChain (5 steps)
                             │
         ┌───────────────────┼───────────────────────────┐
         ▼                   ▼                           ▼
   PSXScraper          NewsScraper             SignalExtractor
   (KSE-100,           (Dawn, ARY,             + ContradictionDetector
    equities)           Geo Business)
         │                   │                           │
         └───────────────────┴───────────────────────────┘
                             │
                        GeminiAgent
                    (gemini-3-flash-preview)
                             │
                      PortfolioBuilder
                             │
                      Portfolio (JSON)
```

### Module Map

| Path | Responsibility |
|---|---|
| `app/config.py` | Pydantic-settings config, all env vars |
| `app/models.py` | Shared domain models (StockQuote, Signal, Portfolio …) |
| `app/chain.py` | 5-step action chain orchestrator |
| `app/scrapers/psx_scraper.py` | PSX market data (KSE-100, equities board) |
| `app/scrapers/news_scraper.py` | Dawn / ARY / Geo financial news |
| `app/signals/extractor.py` | Market + news → typed Signal objects |
| `app/signals/detector.py` | Contradiction detection & resolution |
| `app/agent/gemini_agent.py` | Gemini reasoning with structured JSON output |
| `app/portfolio/builder.py` | JSON → Portfolio (PKR amounts, shares, Sharpe) |
| `app/api/routes.py` | FastAPI endpoints |
| `app/store.py` | In-memory LRU run store (swap for Redis in prod) |

---

## The 5-Step Action Chain

```
Step 1 — SCRAPE_MARKET_DATA
  └─ Fetches KSE-100 index, all-share prices, volumes from PSX

Step 2 — SCRAPE_NEWS
  └─ Concurrently scrapes Dawn Business, ARY Business, Geo Business
     Extracts ticker mentions via regex

Step 3 — EXTRACT_SIGNALS
  └─ Market signals  : price momentum × volume surge → direction + confidence
     News signals    : keyword-sentiment scoring per article × ticker

Step 4 — RESOLVE_CONFLICTS
  └─ Detects: bullish_vs_bearish | source_disagreement | confidence_spread
     Resolves: weighted-confidence arbitration
     Produces: ConflictReport[] with resolution_rationale

Step 5 — CONSTRUCT_PORTFOLIO
  └─ GeminiAgent reasons over signals + conflicts → structured JSON
     PortfolioBuilder converts JSON → typed Portfolio
     (PKR allocation, share count, stop-loss, target, Sharpe ratio)
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/your-org/psx-portfolio-agent.git
cd psx-portfolio-agent
python -m venv .venv && source .venv/bin/activate
make install-dev
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env — add your GOOGLE_API_KEY
```

### 3. Run locally

```bash
make run
# API available at http://localhost:8080
# Swagger UI  at http://localhost:8080/docs
```

---

## API Reference

### `POST /api/v1/portfolio/run`
Trigger the full 5-step agent pipeline. Returns `202 Accepted` immediately with a `run_id`.

**Request body:**
```json
{
  "capital_pkr": 1000000,
  "max_positions": 10,
  "risk_preference": "medium",
  "tickers_filter": []
}
```

**Response (202):**
```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in_progress",
  "created_at": "2026-05-12T15:00:00Z"
}
```

### `GET /api/v1/portfolio/{run_id}`
Poll for completion. `status` transitions: `pending → in_progress → completed | failed`.

### `GET /api/v1/market/snapshot`
One-shot PSX market scrape — no pipeline required.

### `GET /api/v1/news?limit=30`
Latest news from all three sources.

### `GET /api/v1/signals/{run_id}`
Returns `{signals: [...], conflicts: [...]}` for a completed run.

---

## Testing

```bash
make test           # full suite
make test-cov       # with HTML coverage report
make test-fast      # stop on first failure
```

All tests are **offline** — scrapers and Gemini are mocked. No network or API key required for `pytest`.

---

## Deployment — Google Cloud Run

### One-command deploy (from source)

```bash
make deploy
```

### CI/CD via Cloud Build

```bash
# Trigger manually
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _REGION=us-central1,_REPO=psx-agent,_SERVICE=psx-portfolio-agent
```

The `cloudbuild.yaml` pipeline:
1. Builds the Docker image
2. Pushes to Artifact Registry
3. Deploys to Cloud Run with `--set-secrets` for the Gemini API key

### Secret setup (one-time)

```bash
echo -n "your-gemini-api-key" | \
  gcloud secrets create psx-agent-gemini-key --data-file=-
```

---

## Code Quality

```bash
make lint       # ruff
make fmt        # black + ruff --fix
make typecheck  # mypy
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | ✅ | — | Gemini API key |
| `GEMINI_MODEL` | | `gemini-3-flash-preview` | Model ID |
| `ENVIRONMENT` | | `development` | `development\|staging\|production` |
| `PORT` | | `8080` | Server port (Cloud Run injects this) |
| `PORTFOLIO_CAPITAL_PKR` | | `1000000` | Default capital (PKR) |
| `PORTFOLIO_MAX_POSITIONS` | | `10` | Max stocks in portfolio |
| `RISK_FREE_RATE` | | `0.21` | SBP rate for Sharpe calculation |
| `REDIS_URL` | | — | Optional Redis for persistent run store |

---

## Project Structure

```
psx-portfolio-agent/
├── app/
│   ├── api/
│   │   └── routes.py         # FastAPI endpoints
│   ├── agent/
│   │   └── gemini_agent.py   # Gemini reasoning engine
│   ├── portfolio/
│   │   └── builder.py        # Portfolio construction
│   ├── scrapers/
│   │   ├── base.py           # Async base with retry
│   │   ├── psx_scraper.py    # PSX market data
│   │   └── news_scraper.py   # Dawn / ARY / Geo
│   ├── signals/
│   │   ├── extractor.py      # Signal generation
│   │   └── detector.py       # Contradiction detection
│   ├── chain.py              # 5-step orchestrator
│   ├── config.py             # Settings
│   ├── logger.py             # Structured logging
│   ├── main.py               # FastAPI factory
│   ├── models.py             # Domain models
│   └── store.py              # Run store
├── tests/
│   ├── conftest.py
│   ├── test_api.py
│   ├── test_chain.py
│   ├── test_detector.py
│   ├── test_portfolio_builder.py
│   ├── test_psx_scraper.py
│   └── test_signals.py
├── main.py                   # Entry point
├── Dockerfile
├── cloudbuild.yaml
├── Makefile
├── pyproject.toml
├── requirements.txt
└── requirements-dev.txt
```

---

## License

MIT — see [LICENSE](LICENSE).
