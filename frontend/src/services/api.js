/**
 * API Service Layer
 * -----------------
 * Real backend calls with automatic fallback to mock data.
 * All API functions try the real endpoint first, then gracefully
 * fall back to mock data if the backend is unavailable.
 */

import axios from 'axios';
import { mockPortfolio, mockPortfolioRun } from '@/data/mockPortfolio';
import { mockMarketSnapshot } from '@/data/mockMarket';
import { mockSignals } from '@/data/mockSignals';
import { mockNews } from '@/data/mockNews';
import { mockTransactions } from '@/data/mockTransactions';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Health Check ───────────────────────────────────────────────────────────
export async function checkHealth() {
  try {
    const res = await api.get('/health');
    return { online: true, data: res.data };
  } catch {
    return { online: false, data: null };
  }
}

// ─── Portfolio ──────────────────────────────────────────────────────────────
export async function runPortfolio({ capital = 1000000, maxPositions = 10, riskPreference = 'medium', tickersFilter = [] } = {}) {
  try {
    const res = await api.post('/portfolio/run', {
      capital_pkr: capital,
      max_positions: maxPositions,
      risk_preference: riskPreference,
      tickers_filter: tickersFilter,
    });
    return { data: res.data, fromMock: false };
  } catch {
    // Simulate async processing delay
    await new Promise(r => setTimeout(r, 3000));
    return { data: mockPortfolioRun, fromMock: true };
  }
}

export async function getPortfolioRun(runId) {
  try {
    const res = await api.get(`/portfolio/${runId}`);
    return { data: res.data, fromMock: false };
  } catch {
    return { data: mockPortfolioRun, fromMock: true };
  }
}

export async function listPortfolioRuns(limit = 10) {
  try {
    const res = await api.get('/portfolio', { params: { limit } });
    return { data: res.data, fromMock: false };
  } catch {
    return { data: [mockPortfolioRun], fromMock: true };
  }
}

// ─── Market ─────────────────────────────────────────────────────────────────
export async function getMarketSnapshot() {
  try {
    const res = await api.get('/market/snapshot');
    return { data: res.data, fromMock: false };
  } catch {
    return { data: mockMarketSnapshot, fromMock: true };
  }
}

// ─── News ───────────────────────────────────────────────────────────────────
export async function getNews(limit = 30) {
  try {
    const res = await api.get('/news', { params: { limit } });
    return { data: res.data, fromMock: false };
  } catch {
    return { data: mockNews, fromMock: true };
  }
}

// ─── Signals ────────────────────────────────────────────────────────────────
export async function getSignals(runId) {
  try {
    const res = await api.get(`/signals/${runId}`);
    return { data: res.data, fromMock: false };
  } catch {
    return { data: { signals: mockSignals, conflicts: [] }, fromMock: true };
  }
}

export default api;
