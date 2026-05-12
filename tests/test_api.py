"""Integration tests for the FastAPI REST API."""

from __future__ import annotations

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

from app.models import ActionStatus, AgentRun, MarketSnapshot, NewsArticle, SignalSource


pytestmark = pytest.mark.asyncio


class TestHealth:
    async def test_health_ok(self, client):
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert "version" in body

    async def test_health_has_environment(self, client):
        resp = await client.get("/api/v1/health")
        assert "environment" in resp.json()


class TestPortfolioRun:
    async def test_run_returns_202(self, client):
        with patch("app.api.routes.ActionChain") as MockChain:
            mock_instance = MockChain.return_value
            mock_instance.execute = AsyncMock(return_value=AgentRun(
                run_id="test-run",
                status=ActionStatus.COMPLETED,
            ))
            resp = await client.post("/api/v1/portfolio/run", json={
                "capital_pkr": 500_000,
                "max_positions": 5,
                "risk_preference": "medium",
                "tickers_filter": [],
            })
        assert resp.status_code == 202

    async def test_run_returns_run_id(self, client):
        resp = await client.post("/api/v1/portfolio/run", json={
            "capital_pkr": 1_000_000,
            "max_positions": 10,
            "risk_preference": "low",
        })
        body = resp.json()
        assert "run_id" in body
        assert len(body["run_id"]) > 0

    async def test_run_invalid_capital(self, client):
        resp = await client.post("/api/v1/portfolio/run", json={
            "capital_pkr": -100,
        })
        assert resp.status_code == 422


class TestGetPortfolioRun:
    async def test_get_nonexistent_run(self, client):
        resp = await client.get("/api/v1/portfolio/nonexistent-id")
        assert resp.status_code == 404

    async def test_get_existing_run(self, client):
        from app.store import RunStore
        run = AgentRun(run_id="known-run-id", status=ActionStatus.COMPLETED)
        RunStore.instance().save(run)

        resp = await client.get("/api/v1/portfolio/known-run-id")
        assert resp.status_code == 200
        assert resp.json()["run_id"] == "known-run-id"


class TestListRuns:
    async def test_list_empty(self, client):
        resp = await client.get("/api/v1/portfolio")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_runs(self, client):
        from app.store import RunStore
        for i in range(3):
            RunStore.instance().save(AgentRun(run_id=f"run-{i}", status=ActionStatus.COMPLETED))
        resp = await client.get("/api/v1/portfolio?limit=10")
        assert len(resp.json()) == 3


class TestSignalsEndpoint:
    async def test_signals_404_unknown_run(self, client):
        resp = await client.get("/api/v1/signals/no-such-run")
        assert resp.status_code == 404

    async def test_signals_returns_signals_and_conflicts(self, client):
        from app.store import RunStore
        from app.models import Signal, SignalDirection
        run = AgentRun(
            run_id="run-with-signals",
            status=ActionStatus.COMPLETED,
            signals=[
                Signal(ticker="ENGRO", direction=SignalDirection.BULLISH,
                       source=SignalSource.PSX_MARKET, confidence=0.75, rationale="test")
            ],
        )
        RunStore.instance().save(run)
        resp = await client.get("/api/v1/signals/run-with-signals")
        assert resp.status_code == 200
        body = resp.json()
        assert "signals" in body
        assert "conflicts" in body
        assert len(body["signals"]) == 1
