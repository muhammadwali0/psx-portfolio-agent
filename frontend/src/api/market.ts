import api from './api';
import type { MarketSnapshot, PrecomputedAggregates, DataManifest } from './types';

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const res = await api.get<MarketSnapshot>('/market/snapshot');
  return res.data;
}

export async function getAggregates(): Promise<PrecomputedAggregates> {
  const res = await api.get<PrecomputedAggregates>('/data/aggregates');
  return res.data;
}

export async function getManifest(): Promise<DataManifest> {
  const res = await api.get<DataManifest>('/data/manifest');
  return res.data;
}
