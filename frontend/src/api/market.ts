import api from './api';
import type { MarketSnapshot, PrecomputedAggregates, DataManifest } from './types';

const MOCK_SNAPSHOT: MarketSnapshot = {
  kse100_index: 65432.10,
  kse100_change: 450.25,
  kse100_change_pct: 0.69,
  kse30_index: 21850.40,
  total_volume: 245000000,
  total_value_mn: 8450.50,
  advances: 185,
  declines: 120,
  unchanged: 45,
  quotes: [
    { symbol: 'SYS', company_name: 'Systems Limited', sector: 'Technology', current_price: 420.50, open_price: 415.00, high_price: 425.00, low_price: 412.00, prev_close: 415.00, change: 5.50, change_pct: 1.33, volume: 15400000, market_cap_mn: 122000, pe_ratio: 18.5, eps: 22.7, timestamp: new Date().toISOString(), source_url: '' },
    { symbol: 'MEBL', company_name: 'Meezan Bank Limited', sector: 'Banking', current_price: 180.40, open_price: 178.00, high_price: 182.50, low_price: 177.00, prev_close: 178.00, change: 2.40, change_pct: 1.35, volume: 12100000, market_cap_mn: 320000, pe_ratio: 6.2, eps: 29.1, timestamp: new Date().toISOString(), source_url: '' },
    { symbol: 'ENGRO', company_name: 'Engro Corporation', sector: 'Fertilizer', current_price: 345.20, open_price: 346.00, high_price: 348.00, low_price: 344.00, prev_close: 346.00, change: -0.80, change_pct: -0.23, volume: 8500000, market_cap_mn: 200000, pe_ratio: 8.8, eps: 39.2, timestamp: new Date().toISOString(), source_url: '' },
    { symbol: 'HUBC', company_name: 'Hub Power Company', sector: 'Power', current_price: 122.10, open_price: 120.00, high_price: 123.50, low_price: 119.50, prev_close: 120.00, change: 2.10, change_pct: 1.75, volume: 18200000, market_cap_mn: 158000, pe_ratio: 4.5, eps: 27.1, timestamp: new Date().toISOString(), source_url: '' },
  ],
  indices: [
    { symbol: 'KSE100', name: 'KSE 100 Index', current_value: 65432.10, change: 450.25, change_pct: 0.69, volume: 245000000, timestamp: new Date().toISOString() },
    { symbol: 'KMI30', name: 'KMI 30 Index', current_value: 110250.30, change: 920.15, change_pct: 0.84, volume: 150000000, timestamp: new Date().toISOString() },
  ],
  board_stats: { advances: 185, declines: 120, unchanged: 45, total_volume: 245000000, total_value_mn: 8450.50, timestamp: new Date().toISOString() },
  futures: [],
  gis: [
    { symbol: 'GIS-1', name: 'GoP Government Sukuk 1', sector: 'Fixed Income', prev_close: 100, open_price: 100, high_price: 100, low_price: 100, current_price: 100, yield_pct: 19.5, change: 0, change_pct: 0, volume: 5000000, timestamp: new Date().toISOString() }
  ],
  scraped_at: new Date().toISOString(),
};

const MOCK_AGGREGATES: PrecomputedAggregates = {
  as_of_date: new Date().toISOString().split('T')[0],
  risk_free_rate: 0.21,
  sector_performance: [
    { sector: 'Technology', symbol_count: 5, avg_ytd_pct: 35.4 },
    { sector: 'Power', symbol_count: 3, avg_ytd_pct: 22.8 },
    { sector: 'Fertilizer', symbol_count: 4, avg_ytd_pct: 18.2 },
    { sector: 'Banking', symbol_count: 10, avg_ytd_pct: 25.1 },
    { sector: 'Cement', symbol_count: 8, avg_ytd_pct: 12.3 },
  ],
  index_breadth: { advances: 185, declines: 120, unchanged: 45, total: 350 },
  top_movers_by_volume: [
    { symbol: 'HUBC', company_name: 'Hub Power Company', sector: 'Power', current_price: 122.10, change_pct: 1.75, volume: 18200000 },
    { symbol: 'SYS', company_name: 'Systems Limited', sector: 'Technology', current_price: 420.50, change_pct: 1.33, volume: 15400000 },
    { symbol: 'MEBL', company_name: 'Meezan Bank Limited', sector: 'Banking', current_price: 180.40, change_pct: 1.35, volume: 12100000 },
  ],
  top_movers_by_change_pct: [
    { symbol: 'HUBC', company_name: 'Hub Power Company', sector: 'Power', current_price: 122.10, change_pct: 1.75, volume: 18200000 },
    { symbol: 'MEBL', company_name: 'Meezan Bank Limited', sector: 'Banking', current_price: 180.40, change_pct: 1.35, volume: 12100000 },
    { symbol: 'SYS', company_name: 'Systems Limited', sector: 'Technology', current_price: 420.50, change_pct: 1.33, volume: 15400000 },
  ],
  futures_oi_leaders: [],
  symbol_volatility_90d: { 'SYS': 22.5, 'MEBL': 18.2, 'ENGRO': 15.4, 'HUBC': 20.1 },
  symbol_ytd_pct: { 'SYS': 42.1, 'MEBL': 31.5, 'ENGRO': 18.2, 'HUBC': 25.4 },
  gis_benchmark_rate: 0.21,
};

const MOCK_MANIFEST: DataManifest = {
  data_sources: {
    psx_market: { last_scraped: new Date().toISOString(), status: 'healthy', records_count: 350 },
    news: { last_scraped: new Date().toISOString(), status: 'healthy', records_count: 50 },
  },
  system_status: 'healthy',
  version: '1.0.0',
};

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  try {
    const res = await api.get<MarketSnapshot>('/market/snapshot');
    return res.data;
  } catch (err) {
    console.warn('Real getMarketSnapshot API failed, falling back to mock:', err);
    return MOCK_SNAPSHOT;
  }
}

export async function getAggregates(): Promise<PrecomputedAggregates> {
  try {
    const res = await api.get<PrecomputedAggregates>('/data/aggregates');
    return res.data;
  } catch (err) {
    console.warn('Real getAggregates API failed, falling back to mock:', err);
    return MOCK_AGGREGATES;
  }
}

export async function getManifest(): Promise<DataManifest> {
  try {
    const res = await api.get<DataManifest>('/data/manifest');
    return res.data;
  } catch (err) {
    console.warn('Real getManifest API failed, falling back to mock:', err);
    return MOCK_MANIFEST;
  }
}
