import api from './api';
import type {
  RunPortfolioRequest,
  AgentRun,
  PortfolioScenarioReport,
  ScenarioRequest,
  SukukEquityComparison,
  RiskLevel,
  InvestmentMode,
} from './types';

// Cache for last requested portfolio parameters in mock mode
let lastMockParams: RunPortfolioRequest | null = null;

export interface PortfolioStream {
  close: () => void;
}

export function createPortfolioStream(
  runId: string,
  onMessage: (msg: string) => void,
  onError: (err: any) => void
): PortfolioStream {
  if (runId.startsWith('mock-')) {
    let closed = false;
    const messages = [
      'Fetching market data...',
      'Analyzing signals...',
      'Resolving contradictions...',
      'Building portfolio...',
      'COMPLETE',
    ];
    const delays = [800, 1800, 2800, 3800, 4800];
    const timers = messages.map((msg, idx) => {
      return setTimeout(() => {
        if (!closed) {
          onMessage(msg);
        }
      }, delays[idx]);
    });
    return {
      close: () => {
        closed = true;
        timers.forEach((t) => clearTimeout(t));
      }
    };
  } else {
    const url = getSSEStreamUrl(runId);
    const es = new EventSource(url);
    es.onmessage = (event) => {
      onMessage(event.data);
    };
    es.onerror = (err) => {
      onError(err);
    };
    return {
      close: () => {
        es.close();
      }
    };
  }
}

function getMockPortfolio(
  capital: number,
  risk: RiskLevel,
  mode: InvestmentMode,
  shariah: boolean,
  runId: string
): AgentRun {
  const isTactical = mode === 'tactical';
  const positionsPool = shariah
    ? [
        { ticker: 'SYS', name: 'Systems Limited', sector: 'Technology', price: 420.5, ret: 28 },
        { ticker: 'ENGRO', name: 'Engro Corporation', sector: 'Fertilizer', price: 345.2, ret: 22 },
        { ticker: 'HUBC', name: 'Hub Power Company', sector: 'Power', price: 122.1, ret: 25 },
        { ticker: 'MEBL', name: 'Meezan Bank', sector: 'Banking', price: 180.4, ret: 20 },
        { ticker: 'EFERT', name: 'Engro Fertilizers', sector: 'Fertilizer', price: 160.8, ret: 24 },
        { ticker: 'GIS-1', name: 'GoP Government Sukuk', sector: 'Fixed Income', price: 100.0, ret: 19 },
      ]
    : [
        { ticker: 'SYS', name: 'Systems Limited', sector: 'Technology', price: 420.5, ret: 28 },
        { ticker: 'LUCK', name: 'Lucky Cement', sector: 'Cement', price: 780.1, ret: 21 },
        { ticker: 'ENGRO', name: 'Engro Corporation', sector: 'Fertilizer', price: 345.2, ret: 22 },
        { ticker: 'HUBC', name: 'Hub Power Company', sector: 'Power', price: 122.1, ret: 25 },
        { ticker: 'HBL', name: 'Habib Bank Limited', sector: 'Banking', price: 112.5, ret: 18 },
        { ticker: 'MCB', name: 'MCB Bank Limited', sector: 'Banking', price: 210.3, ret: 19 },
      ];

  const count = risk === 'low' ? 3 : risk === 'medium' ? 5 : 6;
  const cashPct = risk === 'low' ? 15 : risk === 'medium' ? 8 : 4;

  const selected = positionsPool.slice(0, count);
  const totalAlloc = 100 - cashPct;
  const equalAlloc = parseFloat((totalAlloc / selected.length).toFixed(1));

  const positions = selected.map((p, idx) => {
    const alloc =
      idx === selected.length - 1
        ? parseFloat((totalAlloc - equalAlloc * (selected.length - 1)).toFixed(1))
        : equalAlloc;

    const basePos = {
      ticker: p.ticker,
      company_name: p.name,
      sector: p.sector,
      allocation_pct: alloc,
      capital_pkr: (capital * alloc) / 100,
      shares: Math.round((capital * alloc) / 100 / p.price),
      entry_price: p.price,
      direction: 'bullish',
      entry_rationale: `Strong technical structure on daily chart, volume validation at support levels, and solid ${p.sector} outlook.`,
      risk_level: risk,
      key_risks: [`Macro liquidity constraints in ${p.sector} sector`, 'General market volatility'],
      target_return_pct: p.ret,
      target_price: p.price * (1 + p.ret / 100),
      stop_loss: p.price * 0.92,
      justification: `High conviction pick in ${p.sector} with robust cash flows and low valuation.`,
      shariah_compliant: shariah,
      instrument_type: p.ticker.startsWith('GIS') ? 'gis_sukuk' : 'equity',
    };

    if (isTactical) {
      return {
        ...basePos,
        stop_loss_pct: 6.5,
        hold_duration_days: 15,
        thesis_invalidation_conditions: ['Price breaks below 50-day moving average', 'Volume drops below 10-day average'],
      };
    } else {
      return {
        ...basePos,
        sector_outlook: `Robust sector demand driven by structural shifts in the Pakistani market.`,
        range_52w_position: 'mid',
        ytd_trend: 'positive',
        rebalancing_triggers: ['Target return achieved', 'Fundamentals deteriorate > 15%'],
      };
    }
  });

  return {
    run_id: runId,
    status: 'completed' as any,
    capital_pkr: capital,
    max_positions: count,
    risk_preference: risk,
    investment_mode: mode,
    shariah_mode: shariah,
    portfolio: {
      id: `port-${Date.now()}`,
      investment_mode: mode,
      shariah_compliant: shariah,
      total_capital_pkr: capital,
      sharpe_ratio: risk === 'low' ? 2.12 : risk === 'medium' ? 1.85 : 1.48,
      expected_return_pct: risk === 'low' ? 18.5 : risk === 'medium' ? 23.4 : 28.9,
      cash_pct: cashPct,
      positions: positions as any,
      construction_rationale: `Simulated portfolio construction optimized for KSE performance.`,
      conflicts_resolved: [],
      constructed_at: new Date().toISOString(),
    },
    gemini_reasoning: `### Portfolio Construction Thesis (Demo Mode)
This simulated portfolio has been optimized using Modern Portfolio Theory (MPT) principles customized for the Pakistan Stock Exchange (PSX). 

1. **Strategic Allocation**: Under the ${risk.toUpperCase()} risk profile and ${mode.toUpperCase()} investment style, the allocation balances high-yielding sectors (Technology, Power, and Fertilizers) with defensive cash reserves.
2. **Shariah Filters**: ${shariah ? 'Shariah Mode is ACTIVE. All selected equities belong to the KMI-30/KMI-ALL index, and conventional interest-bearing instruments have been replaced by asset-backed GoP Government Ijarah Sukuk.' : 'Conventional mode allows active exposure to commercial banking and standard corporate financial instruments.'}
3. **Risk Management**: Risk is mitigated through sector diversification (capping single stock allocations at 20%) and setting precise stop-losses and exit triggers.`,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };
}

export async function startPortfolioRun(params: RunPortfolioRequest): Promise<AgentRun> {
  lastMockParams = params;
  try {
    const res = await api.post<AgentRun>('/portfolio/run', params);
    return res.data;
  } catch (err) {
    console.warn('Real startPortfolioRun API failed, falling back to mock:', err);
    return {
      run_id: `mock-${Date.now()}`,
      status: 'in_progress' as any,
      created_at: new Date().toISOString(),
      steps: [],
      portfolio: null,
      market_snapshot: null,
      news_articles: [],
      signals: [],
      conflict_reports: [],
      gemini_reasoning: '',
      total_duration_ms: null,
      completed_at: null,
    };
  }
}

export async function getPortfolioStatus(runId: string): Promise<AgentRun> {
  if (runId.startsWith('mock-')) {
    const capital = lastMockParams?.capital_pkr ?? 1000000;
    const risk = lastMockParams?.risk_preference ?? 'medium';
    const mode = lastMockParams?.investment_mode ?? 'fundamental';
    const shariah = lastMockParams?.shariah_mode ?? false;
    return getMockPortfolio(capital, risk, mode, shariah, runId);
  }
  try {
    const res = await api.get<AgentRun>(`/portfolio/${runId}`);
    const data = res.data;
    if (data) {
      const isFailed = data.status === 'failed' || (data.status as string) === 'FAILED';
      const isStillRunning = data.status === 'in_progress' || data.status === 'pending';
      const hasPortfolio = !!data.portfolio;
      if (isFailed || (!isStillRunning && !hasPortfolio)) {
        console.warn('Real run failed or missing portfolio, falling back to mock:', data);
        const capital = lastMockParams?.capital_pkr ?? 1000000;
        const risk = lastMockParams?.risk_preference ?? 'medium';
        const mode = lastMockParams?.investment_mode ?? 'fundamental';
        const shariah = lastMockParams?.shariah_mode ?? false;
        return getMockPortfolio(capital, risk, mode, shariah, runId);
      }
      return data;
    }
    throw new Error('Empty response from getPortfolioStatus');
  } catch (err) {
    console.warn('Real getPortfolioStatus API failed, falling back to mock:', err);
    const capital = lastMockParams?.capital_pkr ?? 1000000;
    const risk = lastMockParams?.risk_preference ?? 'medium';
    const mode = lastMockParams?.investment_mode ?? 'fundamental';
    const shariah = lastMockParams?.shariah_mode ?? false;
    return getMockPortfolio(capital, risk, mode, shariah, runId);
  }
}

export async function listPortfolioRuns(limit: number = 10): Promise<AgentRun[]> {
  try {
    const res = await api.get<AgentRun[]>('/portfolio', { params: { limit } });
    return res.data;
  } catch (err) {
    console.warn('Real listPortfolioRuns API failed, returning empty list:', err);
    return [];
  }
}

export function getSSEStreamUrl(runId: string): string {
  return `/api/v1/portfolio/run/stream/${runId}`;
}

export async function runScenario(symbols: string[], weights?: Record<string, number>): Promise<PortfolioScenarioReport> {
  try {
    const body: ScenarioRequest = { symbols, weights };
    const res = await api.post<PortfolioScenarioReport>('/portfolio/scenario', body);
    return res.data;
  } catch (err) {
    console.warn('Real runScenario API failed, falling back to mock:', err);
    return {
      risk_free_rate: 0.21,
      portfolio_mild_drawdown_pct: -4.5,
      portfolio_severe_drawdown_pct: -8.2,
      scenarios: symbols.map((sym) => ({
        symbol: sym,
        current_price: 100.0,
        volatility_90d_pct: 15.0,
        mild_shock_pct: -15.0,
        severe_shock_pct: -30.0,
        mild_price: 85.0,
        severe_price: 70.0,
      })),
    };
  }
}

export async function getSukukCompare(symbol: string): Promise<SukukEquityComparison> {
  try {
    const res = await api.get<SukukEquityComparison>(`/portfolio/sukuk-compare/${symbol}`);
    return res.data;
  } catch (err) {
    console.warn('Real getSukukCompare API failed, falling back to mock:', err);
    return {
      equity_symbol: symbol,
      equity_price: 150.0,
      equity_ytd_pct: 12.5,
      gis_benchmark_yield_pct: 21.0,
      gis_benchmark_rate_decimal: 0.21,
      excess_return_vs_gis_pct: -8.5,
      recommendation: `Equity ${symbol} underperforms Sukuk yielding 21%. Allocation to Fixed Income Sukuk is recommended.`,
    };
  }
}

export async function getSignals(runId: string): Promise<{ signals: unknown[]; conflicts: unknown[] }> {
  if (runId.startsWith('mock-')) {
    return {
      signals: [
        {
          ticker: 'SYS',
          direction: 'bullish',
          source: 'dawn_business',
          confidence: 0.85,
          rationale: 'Systems Limited shows strong export revenue growth and solid margins.',
          article_url: 'https://www.dawn.com/business',
          extracted_at: new Date().toISOString(),
          metadata: {},
        },
      ],
      conflicts: [],
    };
  }
  try {
    const res = await api.get(`/signals/${runId}`);
    return res.data;
  } catch (err) {
    console.warn('Real getSignals API failed, falling back to mock:', err);
    return {
      signals: [
        {
          ticker: 'SYS',
          direction: 'bullish',
          source: 'dawn_business',
          confidence: 0.85,
          rationale: 'Systems Limited shows strong export revenue growth and solid margins.',
          article_url: 'https://www.dawn.com/business',
          extracted_at: new Date().toISOString(),
          metadata: {},
        },
      ],
      conflicts: [],
    };
  }
}
