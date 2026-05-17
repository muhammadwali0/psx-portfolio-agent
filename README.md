<div align="center">

<img src="logo.png" alt="PSX Portfolio Agent" width="120" />

# PSX Portfolio Agent

**Autonomous AI-powered investment intelligence for the Pakistan Stock Exchange**

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini_2.5-AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Cloud Run](https://img.shields.io/badge/Cloud_Run-Deployed-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)](https://cloud.google.com/run)

<br/>

> Built for the **AISeekho 2026 — Google Antigravity Hackathon** · Challenge 1: Autonomous Content-to-Action Agent

<br/>

![Demo](https://img.shields.io/badge/Status-Live-22c55e?style=flat-square&logo=statuspage&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-a855f7?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-Offline%20%26%20Mocked-6366f1?style=flat-square&logo=pytest&logoColor=white)

</div>

---

## What It Does

PSX Portfolio Agent is a fully autonomous, end-to-end agentic system that scrapes live market data from the Pakistan Stock Exchange, reads financial news from Pakistan's top sources, extracts and cross-validates investment signals, resolves contradictions using weighted arbitration, and produces a fully justified, risk-adjusted portfolio — all in a single API call.

The agent does not rely on static rules. Every portfolio is reasoned from scratch by Gemini, grounded in real-time data scraped minutes before.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       React Frontend                            │
│         Vite · Tailwind CSS · Framer Motion · Axios             │
└──────────────────────────┬──────────────────────────────────────┘
                           │  REST  /api/v1
┌──────────────────────────▼──────────────────────────────────────┐
│                    FastAPI REST API                             │
│         /health · /portfolio/run · /market/snapshot · /news     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                  ActionChain (5 Steps)
                           │
         ┌─────────────────┼──────────────────────┐
         ▼                 ▼                       ▼
   PSXScraper        NewsScraper          SignalExtractor
   KSE-100 Index     Dawn Business        + ContradictionDetector
   Equities Board    ARY Business
   (Playwright)      Geo Business
         │                 │                       │
         └─────────────────┴───────────────────────┘
                           │
                      GeminiAgent
                  (gemini-3-flash-preview)
                           │
                   PortfolioBuilder
                  PKR amounts · Shares
                  Stop-loss · Sharpe
                           │
                    Portfolio (JSON)
```

---

## The 5-Step Action Chain

| Step | Action | Description |
|------|--------|-------------|
| 1 | **Scrape Market Data** | Fetches KSE-100 index, all-share prices, and volumes from PSX using Playwright for JS-rendered pages |
| 2 | **Scrape News** | Concurrently scrapes Dawn Business, ARY Business, and Geo Business; extracts ticker mentions via regex |
| 3 | **Extract Signals** | Price momentum × volume surge → market signals; keyword sentiment scoring → news signals |
| 4 | **Resolve Conflicts** | Detects `bullish_vs_bearish`, `source_disagreement`, `confidence_spread`; resolves via weighted arbitration |
| 5 | **Construct Portfolio** | Gemini reasons over signals + conflicts → structured JSON → typed Portfolio with PKR allocation, share counts, stop-losses, and Sharpe ratio |

---

## Tech Stack

### Backend
[![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Pydantic](https://img.shields.io/badge/Pydantic_v2-E92063?style=flat-square&logo=pydantic&logoColor=white)](https://docs.pydantic.dev)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev)
[![BeautifulSoup](https://img.shields.io/badge/BeautifulSoup4-4B8BBE?style=flat-square&logo=python&logoColor=white)]()
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![structlog](https://img.shields.io/badge/structlog-24.2-6366f1?style=flat-square)]()

### AI
[![Google Gemini](https://img.shields.io/badge/Gemini_2.5_Pro-4285F4?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Tenacity](https://img.shields.io/badge/Tenacity-Retry_Logic-f59e0b?style=flat-square)]()
[![diskcache](https://img.shields.io/badge/diskcache-Response_Cache-6366f1?style=flat-square)]()

### Frontend
[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com) [![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white)](https://axios-http.com)

### Infrastructure
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![Google Cloud Run](https://img.shields.io/badge/Cloud_Run-4285F4?style=flat-square&logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Cloud Build](https://img.shields.io/badge/Cloud_Build-CI%2FCD-4285F4?style=flat-square&logo=googlecloud&logoColor=white)](https://cloud.google.com/build)

---

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone & install

```bash
git clone https://github.com/muhammadwali0/psx-portfolio-agent.git
cd psx-portfolio-agent
python -m venv .venv && source .venv/bin/activate
make install-dev
```

### 2. Configure

```bash
cp .env.example .env
# Add your GOOGLE_API_KEY to .env
```

### 3. Run

```bash
# Backend only
make run

# Backend + Frontend together
make run-all
```

| Service | URL |
|---------|-----|
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/docs |
| Frontend | http://localhost:5173 |

---

## API Reference

### `POST /api/v1/portfolio/run`
Triggers the full 5-step agent pipeline. Returns `202 Accepted` immediately with a `run_id` for polling.

```json
{
  "capital_pkr": 1000000,
  "max_positions": 5,
  "risk_preference": "medium",
  "tickers_filter": []
}
```

### `GET /api/v1/portfolio/{run_id}`
Poll for completion. Status transitions: `pending → in_progress → completed | failed`

### `GET /api/v1/market/snapshot`
Live PSX market snapshot — no pipeline required.

### `GET /api/v1/news?limit=30`
Latest articles from Dawn Business, ARY Business, and Geo Business.

### `GET /api/v1/signals/{run_id}`
Returns `{ signals: [...], conflicts: [...] }` for a completed run.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | ✅ | — | Gemini API key |
| `GEMINI_MODEL` | | `gemini-3-flash-preview` | Model ID |
| `ENVIRONMENT` | | `development` | `development \| staging \| production` |
| `PORT` | | `8080` | Server port (Cloud Run injects this) |
| `PORTFOLIO_CAPITAL_PKR` | | `1000000` | Default capital in PKR |
| `PORTFOLIO_MAX_POSITIONS` | | `5` | Max stocks in portfolio |
| `RISK_FREE_RATE` | | `0.21` | SBP policy rate for Sharpe calculation |
| `REDIS_URL` | | — | Optional Redis for persistent run store |

---

## Testing

All tests are **fully offline** — scrapers and Gemini are mocked. No API key or network required.

```bash
make test        # Full suite
make test-cov    # With HTML coverage report
make test-fast   # Stop on first failure
```

```
tests/
├── test_api.py               # FastAPI endpoint integration tests
├── test_chain.py             # ActionChain orchestrator tests
├── test_detector.py          # ContradictionDetector unit tests
├── test_portfolio_builder.py # PortfolioBuilder unit tests
├── test_psx_scraper.py       # PSXScraper HTML parsing tests
└── test_signals.py           # SignalExtractor unit tests
```

---

## Deployment

### Docker

```bash
make docker-build
make docker-run
```

### Google Cloud Run (one command)

```bash
make deploy
```

### CI/CD via Cloud Build

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _REGION=us-central1,_REPO=psx-agent,_SERVICE=psx-portfolio-agent
```

The `cloudbuild.yaml` pipeline builds the Docker image, pushes to Artifact Registry, and deploys to Cloud Run with secrets injected from Secret Manager.

---

## Code Quality

```bash
make lint       # ruff
make fmt        # black + ruff --fix
make typecheck  # mypy
```

---

## Project Structure

```
psx-portfolio-agent/
├── app/
│   ├── agent/gemini_agent.py     # Gemini reasoning engine
│   ├── api/routes.py             # FastAPI endpoints
│   ├── portfolio/builder.py      # Portfolio construction
│   ├── scrapers/
│   │   ├── base.py               # Async base with retry
│   │   ├── psx_scraper.py        # PSX market data (Playwright)
│   │   └── news_scraper.py       # Dawn / ARY / Geo
│   ├── signals/
│   │   ├── extractor.py          # Signal generation
│   │   └── detector.py           # Contradiction detection
│   ├── chain.py                  # 5-step orchestrator
│   ├── config.py                 # Pydantic settings
│   ├── models.py                 # Domain models
│   └── store.py                  # Run store (memory / Redis)
├── frontend/                     # React + Vite frontend
├── tests/                        # Offline test suite
├── Dockerfile
├── cloudbuild.yaml
└── Makefile
```

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

Built with ❤️ in Karachi for **AISeekho 2026 — Google Antigravity Hackathon**

<a href="https://github.com/muhammadwali0/psx-portfolio-agent">
  <img src="https://img.shields.io/github/stars/muhammadwali0/psx-portfolio-agent?style=social" alt="GitHub Stars" />
</a>

</div>
