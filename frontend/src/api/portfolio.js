import axios from 'axios';

const api = axios.create({
  baseURL: 'https://psx-portfolio-agent-984015272058.us-central1.run.app/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ──────────────────────────────────────────────────────
// DEMO MODE: Set to false once your backend is running
// ──────────────────────────────────────────────────────
const DEMO_MODE = false;

// ── Demo data (only used when DEMO_MODE = true) ──────
const DEMO_RESULT = {
  status: 'completed',
  portfolio: {
    summary: {
      sharpe_ratio: 2.45,
      expected_return: 18.2,
      cash_percentage: 5.0,
      overall_risk: 'medium',
      rationale:
        'AI models identified strong momentum in Technology and Energy sectors on PSX. Position sizing was optimized using Modern Portfolio Theory to maximize risk-adjusted returns while maintaining a 5% cash buffer for tactical rebalancing.',
    },
    positions: [
      {
        ticker: 'SYS', company_name: 'Systems Limited', sector: 'Technology',
        allocation_pct: 40, capital_pkr: 400000, shares: 480,
        entry_price: 832.5, target_price: 950.0, stop_loss: 780.0,
        risk_level: 'medium',
        justification: 'Export-driven revenue hedges PKR depreciation risk. Strong Q3 earnings beat and bullish technical breakout above 200-day EMA.',
      },
      {
        ticker: 'OGDC', company_name: 'Oil & Gas Dev Co', sector: 'Energy',
        allocation_pct: 35, capital_pkr: 350000, shares: 2950,
        entry_price: 118.6, target_price: 135.0, stop_loss: 105.0,
        risk_level: 'low',
        justification: 'Exceptionally low PE ratio with 8.5% dividend yield. Government circular debt resolution acts as positive catalyst.',
      },
      {
        ticker: 'HUBC', company_name: 'Hub Power Company', sector: 'Power Generation',
        allocation_pct: 20, capital_pkr: 200000, shares: 1450,
        entry_price: 137.9, target_price: 155.0, stop_loss: 128.0,
        risk_level: 'low',
        justification: 'Defensive play with reliable capacity payments. Expansion into Thar coal mining and renewable energy diversifies growth.',
      },
    ],
    signals: [
      { ticker: 'SYS', sentiment: 'bullish', confidence: 0.92, headline: 'Systems Ltd wins $12M Middle East IT services contract', source: 'Dawn Business' },
      { ticker: 'OGDC', sentiment: 'bullish', confidence: 0.85, headline: 'Oil prices stabilize above $78; OGDC production up 5% QoQ', source: 'Business Recorder' },
      { ticker: 'HUBC', sentiment: 'neutral', confidence: 0.60, headline: 'Power sector circular debt reforms under cabinet review', source: 'Profit by Pakistan Today' },
      { ticker: 'TRG', sentiment: 'bearish', confidence: 0.78, headline: 'TRG Pakistan posts quarterly loss amid global tech correction', source: 'Bloomberg' },
      { ticker: 'LUCK', sentiment: 'bullish', confidence: 0.71, headline: 'Lucky Cement exports surge 22% on African demand', source: 'The News International' },
    ],
  },
};

let _demoPolls = 0;

// ── Exported API functions ───────────────────────────
export async function startPortfolioRun(params) {
  if (DEMO_MODE) {
    _demoPolls = 0;
    return { run_id: 'demo-' + Date.now(), status: 'in_progress' };
  }
  const res = await api.post('/portfolio/run', {
    capital_pkr: params.capital_pkr,
    max_positions: params.max_positions,
    risk_preference: params.risk_preference,
    tickers_filter: params.tickers_filter || [],
  });
  return res.data;
}

export async function getPortfolioStatus(runId) {
  if (DEMO_MODE) {
    _demoPolls++;
    // Simulate ~42 seconds of agent processing (21 polls × 2s)
    if (_demoPolls < 21) return { status: 'in_progress' };
    _demoPolls = 0;
    return DEMO_RESULT;
  }
  const res = await api.get(`/portfolio/${runId}`);
  return res.data;
}

export default api;
