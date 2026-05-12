# ─── Base image ───────────────────────────────────────────────────────────────
FROM python:3.12-slim AS base

WORKDIR /app

# System deps for lxml / Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libxml2-dev \
    libxslt-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ─── Dependencies layer ───────────────────────────────────────────────────────
FROM base AS deps

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (Chromium for JS-heavy PSX pages)
RUN playwright install chromium --with-deps

# ─── Application ──────────────────────────────────────────────────────────────
FROM deps AS app

COPY . .

# Cloud Run injects PORT env var; default to 8080
ENV PORT=8080
EXPOSE 8080

# Use non-root user for security
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2", "--log-level", "info"]
