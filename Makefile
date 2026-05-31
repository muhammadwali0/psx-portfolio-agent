.PHONY: install install-dev run test lint fmt typecheck clean docker-build

# ─── Setup ─────────────────────────────────────────────────────────────────────
install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements-dev.txt
	playwright install chromium

# ─── Development ───────────────────────────────────────────────────────────────
run:
	cp -n .env.example .env 2>/dev/null || true
	uvicorn main:app --reload --host 0.0.0.0 --port 8080

run-all:
	concurrently "make run" "cd frontend && npm run dev"

# ─── Testing ───────────────────────────────────────────────────────────────────
test:
	pytest tests/ -v --tb=short

test-cov:
	pytest tests/ --cov=app --cov-report=term-missing --cov-report=html

test-fast:
	pytest tests/ -v --tb=short -x  # stop on first failure

# ─── Code quality ──────────────────────────────────────────────────────────────
lint:
	ruff check app/ tests/

fmt:
	black app/ tests/ main.py
	ruff check --fix app/ tests/

typecheck:
	mypy app/

# ─── Docker ────────────────────────────────────────────────────────────────────
docker-build:
	docker build -t psx-portfolio-agent:latest .

docker-run:
	docker run --rm -p 8080:8080 \
		--env-file .env \
		--network host \
		psx-portfolio-agent:latest

# ─── Cloud Run (manual deploy) ─────────────────────────────────────────────────
historical-download:
	python -m app.historical.job

deploy-historical-job:
	gcloud builds submit --config cloudbuild-historical-job.yaml

deploy:
	gcloud run deploy psx-portfolio-agent \
		--source . \
		--region us-central1 \
		--allow-unauthenticated \
		--memory 1Gi \
		--set-secrets GOOGLE_API_KEY=psx-agent-gemini-key:latest

# ─── Utilities ─────────────────────────────────────────────────────────────────
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete
	rm -rf .pytest_cache .mypy_cache .ruff_cache htmlcov .coverage
