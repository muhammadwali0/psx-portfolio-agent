/**
 * PSX Portfolio Agent — TypeScript API Types
 * Mirrors backend Pydantic models exactly. DO NOT MODIFY.
 */

/* ── Enumerations ──────────────────────────────── */

export type SignalDirection = 'bullish' | 'bearish' | 'neutral';
export type SignalSource = 'psx_market' | 'dawn_business' | 'ary_business' | 'geo_business' | 'gemini_reasoning';
export type RiskLevel = 'low' | 'medium' | 'high';
export type InvestmentMode = 'tactical' | 'fundamental';
export type ActionType = 'scrape_market_data' | 'scrape_news' | 'extract_signals' | 'resolve_conflicts' | 'construct_portfolio' | 'simulate_execution';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/* ── Market Data ───────────────────────────────── */

export interface StockQuote {
  symbol: string;
  company_name: string;
  sector: string;
  current_price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  prev_close: number;
  change: number;
  change_pct: number;
  volume: number;
  market_cap_mn: number;
  pe_ratio: number | null;
  eps: number | null;
  timestamp: string;
  source_url: string;
}

export interface IndexSnapshot {
  symbol: string;
  name: string;
  current_value: number;
  change: number;
  change_pct: number;
  volume: number;
  timestamp: string;
}

export interface BoardStats {
  advances: number;
  declines: number;
  unchanged: number;
  total_volume: number;
  total_value_mn: number;
  timestamp: string;
}

export interface FuturesContract {
  symbol: string;
  open_price: number;
  high_price: number;
  low_price: number;
  current_price: number;
  change: number;
  change_pct: number;
  volume: number;
  timestamp: string;
}

export interface GISMetrics {
  symbol: string;
  name: string;
  sector: string;
  prev_close: number;
  open_price: number;
  high_price: number;
  low_price: number;
  current_price: number;
  yield_pct: number;
  change: number;
  change_pct: number;
  volume: number;
  timestamp: string;
}

export interface MarketSnapshot {
  kse100_index: number;
  kse100_change: number;
  kse100_change_pct: number;
  kse30_index: number;
  total_volume: number;
  total_value_mn: number;
  advances: number;
  declines: number;
  unchanged: number;
  quotes: StockQuote[];
  indices: IndexSnapshot[];
  board_stats: BoardStats | null;
  futures: FuturesContract[];
  gis: GISMetrics[];
  scraped_at: string;
}

/* ── Aggregates ────────────────────────────────── */

export interface SectorPerformance {
  sector: string;
  symbol_count: number;
  avg_ytd_pct: number;
}

export interface IndexBreadth {
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
}

export interface MoverQuote {
  symbol: string;
  company_name: string;
  sector: string;
  current_price: number;
  change_pct: number;
  volume: number;
}

export interface FuturesOILeader {
  symbol: string;
  open_interest: number;
  latest_price: number;
}

export interface PrecomputedAggregates {
  as_of_date: string | null;
  risk_free_rate: number;
  sector_performance: SectorPerformance[];
  index_breadth: IndexBreadth;
  top_movers_by_volume: MoverQuote[];
  top_movers_by_change_pct: MoverQuote[];
  futures_oi_leaders: FuturesOILeader[];
  symbol_volatility_90d: Record<string, number>;
  symbol_ytd_pct: Record<string, number>;
  gis_benchmark_rate: number | null;
}

/* ── News ──────────────────────────────────────── */

export interface NewsArticle {
  title: string;
  url: string;
  source: SignalSource;
  published_at: string | null;
  summary: string;
  full_text: string;
  tickers_mentioned: string[];
  scraped_at: string;
}

/* ── Signals ───────────────────────────────────── */

export interface Signal {
  ticker: string;
  direction: SignalDirection;
  source: SignalSource;
  confidence: number;
  rationale: string;
  article_url: string;
  extracted_at: string;
  metadata: Record<string, unknown>;
}

export interface ConflictReport {
  ticker: string;
  conflicting_signals: Signal[];
  conflict_type: string;
  severity: number;
  resolution: SignalDirection | null;
  resolution_rationale: string;
  resolved_at: string | null;
}

/* ── Portfolio ─────────────────────────────────── */

export interface PortfolioPosition {
  ticker: string;
  company_name: string;
  sector: string;
  allocation_pct: number;
  capital_pkr: number;
  shares: number;
  entry_price: number;
  stop_loss: number | null;
  target_price: number | null;
  hold_duration_days: number | null;
  thesis_invalidation_conditions: string[];
  sector_outlook: string;
  range_52w_position: string;
  ytd_trend: string;
  rebalancing_triggers: string[];
  risk_level: RiskLevel;
  supporting_signals: Signal[];
  justification: string;
  instrument_type: string;
  shariah_compliant: boolean;
}

export interface Portfolio {
  id: string;
  investment_mode: InvestmentMode;
  shariah_compliant: boolean;
  total_capital_pkr: number;
  positions: PortfolioPosition[];
  cash_pct: number;
  expected_return_pct: number | null;
  sharpe_ratio: number | null;
  overall_risk: RiskLevel;
  construction_rationale: string;
  conflicts_resolved: ConflictReport[];
  constructed_at: string;
}

/* ── Agent Run ─────────────────────────────────── */

export interface ActionStep {
  step_number: number;
  action_type: ActionType;
  status: ActionStatus;
  input_state: Record<string, unknown>;
  output_state: Record<string, unknown>;
  duration_ms: number | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface AgentRun {
  run_id: string;
  status: ActionStatus;
  steps: ActionStep[];
  portfolio: Portfolio | null;
  market_snapshot: MarketSnapshot | null;
  news_articles: NewsArticle[];
  signals: Signal[];
  conflict_reports: ConflictReport[];
  gemini_reasoning: string;
  total_duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

/* ── Request / Response ────────────────────────── */

export interface RunPortfolioRequest {
  capital_pkr: number;
  max_positions: number;
  risk_preference: RiskLevel;
  investment_mode: InvestmentMode;
  shariah_mode: boolean;
  tickers_filter: string[];
}

export interface ChatRequest {
  message: string;
  history: Array<{ role: string; content: string }>;
  shariah_mode: boolean;
}

export interface ChatResponse {
  reply: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface ScenarioRequest {
  symbols: string[];
  weights?: Record<string, number>;
}

export interface ScenarioResult {
  symbol: string;
  current_price: number;
  volatility_90d_pct: number;
  mild_shock_pct: number;
  severe_shock_pct: number;
  mild_price: number;
  severe_price: number;
}

export interface PortfolioScenarioReport {
  risk_free_rate: number;
  scenarios: ScenarioResult[];
  portfolio_mild_drawdown_pct: number | null;
  portfolio_severe_drawdown_pct: number | null;
}

export interface SukukEquityComparison {
  equity_symbol: string;
  equity_price: number;
  equity_ytd_pct: number | null;
  gis_benchmark_yield_pct: number;
  gis_benchmark_rate_decimal: number;
  excess_return_vs_gis_pct: number | null;
  recommendation: string;
}

export interface DataManifest {
  last_updated: string;
  trading_day: string | null;
  sqlite_as_of: string | null;
  sources: Record<string, { ok: boolean; message: string; row_count: number }>;
  risk_free_rate: number;
  quote_count: number;
  symbol_ma_count: number;
}
