import api from './api';
import type {
  RunPortfolioRequest,
  AgentRun,
  PortfolioScenarioReport,
  ScenarioRequest,
  SukukEquityComparison,
} from './types';

export interface PortfolioStream {
  close: () => void;
}

export function createPortfolioStream(
  runId: string,
  onMessage: (msg: string) => void,
  onError: (err: unknown) => void
): PortfolioStream {
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
    },
  };
}

export async function startPortfolioRun(params: RunPortfolioRequest): Promise<AgentRun> {
  const res = await api.post<AgentRun>('/portfolio/run', params);
  return res.data;
}

export async function getPortfolioStatus(runId: string): Promise<AgentRun> {
  const res = await api.get<AgentRun>(`/portfolio/${runId}`);
  const data = res.data;
  if (!data) {
    throw new Error('Empty response from getPortfolioStatus');
  }
  const isFailed = data.status === 'failed' || (data.status as string) === 'FAILED';
  if (isFailed) {
    throw new Error('Portfolio generation failed on backend');
  }
  return data;
}

export async function listPortfolioRuns(limit: number = 10): Promise<AgentRun[]> {
  const res = await api.get<AgentRun[]>('/portfolio', { params: { limit } });
  return res.data;
}

export function getSSEStreamUrl(runId: string): string {
  return `/api/v1/portfolio/run/stream/${runId}`;
}

export async function runScenario(
  symbols: string[],
  weights?: Record<string, number>
): Promise<PortfolioScenarioReport> {
  const body: ScenarioRequest = { symbols, weights };
  const res = await api.post<PortfolioScenarioReport>('/portfolio/scenario', body);
  return res.data;
}

export async function getSukukCompare(symbol: string): Promise<SukukEquityComparison> {
  const res = await api.get<SukukEquityComparison>(`/portfolio/sukuk-compare/${symbol}`);
  return res.data;
}

export async function getSignals(
  runId: string
): Promise<{ signals: unknown[]; conflicts: unknown[] }> {
  const res = await api.get(`/signals/${runId}`);
  return res.data;
}
