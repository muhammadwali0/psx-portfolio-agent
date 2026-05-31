/**
 * PSX Portfolio Agent — Zustand Global Store
 */
import { create } from 'zustand';
import type { MarketSnapshot, PrecomputedAggregates, NewsArticle, AgentRun, RiskLevel, InvestmentMode } from '../api/types';

export type ScreenName = 'dashboard' | 'portfolio' | 'news' | 'chat' | 'settings';

interface AppSlice {
  activeScreen: ScreenName;
  drawerOpen: boolean;
  splashDone: boolean;
  shariahMode: boolean;
  setScreen: (s: ScreenName) => void;
  toggleDrawer: () => void;
  closeDrawer: () => void;
  setSplashDone: () => void;
  toggleShariah: () => void;
  setShariah: (v: boolean) => void;
}

interface MarketSlice {
  snapshot: MarketSnapshot | null;
  aggregates: PrecomputedAggregates | null;
  marketLoading: boolean;
  marketError: string | null;
  setSnapshot: (s: MarketSnapshot) => void;
  setAggregates: (a: PrecomputedAggregates) => void;
  setMarketLoading: (v: boolean) => void;
  setMarketError: (e: string | null) => void;
}

interface PortfolioSlice {
  runId: string | null;
  portfolioStatus: 'idle' | 'loading' | 'streaming' | 'completed' | 'error';
  portfolioResult: AgentRun | null;
  portfolioError: string | null;
  progressMessages: string[];
  setRunId: (id: string | null) => void;
  setPortfolioStatus: (s: 'idle' | 'loading' | 'streaming' | 'completed' | 'error') => void;
  setPortfolioResult: (r: AgentRun | null) => void;
  setPortfolioError: (e: string | null) => void;
  addProgressMessage: (msg: string) => void;
  resetPortfolio: () => void;
}

interface NewsSlice {
  articles: NewsArticle[];
  newsLoading: boolean;
  newsError: string | null;
  sectorFilter: string | null;
  setArticles: (a: NewsArticle[]) => void;
  setNewsLoading: (v: boolean) => void;
  setNewsError: (e: string | null) => void;
  setSectorFilter: (s: string | null) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatSlice {
  messages: ChatMessage[];
  chatLoading: boolean;
  addMessage: (msg: ChatMessage) => void;
  setChatLoading: (v: boolean) => void;
  clearChat: () => void;
}

interface SettingsSlice {
  riskDefault: RiskLevel;
  capitalDefault: number;
  modeDefault: InvestmentMode;
  theme: 'dark' | 'light';
  exportLoading: boolean;
  setRiskDefault: (r: RiskLevel) => void;
  setCapitalDefault: (c: number) => void;
  setModeDefault: (m: InvestmentMode) => void;
  toggleTheme: () => void;
  setExportLoading: (v: boolean) => void;
}

type Store = AppSlice & MarketSlice & PortfolioSlice & NewsSlice & ChatSlice & SettingsSlice;

export const useStore = create<Store>((set) => ({
  /* ── App ─────────────────────────────────────── */
  activeScreen: 'dashboard',
  drawerOpen: false,
  splashDone: false,
  shariahMode: (() => {
    try { return localStorage.getItem('psx-shariah') === 'true'; } catch { return false; }
  })(),
  setScreen: (s) => set({ activeScreen: s, drawerOpen: false }),
  toggleDrawer: () => set((st) => ({ drawerOpen: !st.drawerOpen })),
  closeDrawer: () => set({ drawerOpen: false }),
  setSplashDone: () => set({ splashDone: true }),
  toggleShariah: () => set((st) => {
    const next = !st.shariahMode;
    try { localStorage.setItem('psx-shariah', String(next)); } catch {}
    return { shariahMode: next };
  }),
  setShariah: (v) => {
    try { localStorage.setItem('psx-shariah', String(v)); } catch {}
    set({ shariahMode: v });
  },

  /* ── Market ──────────────────────────────────── */
  snapshot: null,
  aggregates: null,
  marketLoading: false,
  marketError: null,
  setSnapshot: (s) => set({ snapshot: s }),
  setAggregates: (a) => set({ aggregates: a }),
  setMarketLoading: (v) => set({ marketLoading: v }),
  setMarketError: (e) => set({ marketError: e }),

  /* ── Portfolio ───────────────────────────────── */
  runId: null,
  portfolioStatus: 'idle',
  portfolioResult: null,
  portfolioError: null,
  progressMessages: [],
  setRunId: (id) => set({ runId: id }),
  setPortfolioStatus: (s) => set({ portfolioStatus: s }),
  setPortfolioResult: (r) => set({ portfolioResult: r }),
  setPortfolioError: (e) => set({ portfolioError: e }),
  addProgressMessage: (msg) => set((st) => ({ progressMessages: [...st.progressMessages, msg] })),
  resetPortfolio: () => set({
    runId: null,
    portfolioStatus: 'idle',
    portfolioResult: null,
    portfolioError: null,
    progressMessages: [],
  }),

  /* ── News ────────────────────────────────────── */
  articles: [],
  newsLoading: false,
  newsError: null,
  sectorFilter: null,
  setArticles: (a) => set({ articles: a }),
  setNewsLoading: (v) => set({ newsLoading: v }),
  setNewsError: (e) => set({ newsError: e }),
  setSectorFilter: (s) => set({ sectorFilter: s }),

  /* ── Chat ────────────────────────────────────── */
  messages: [],
  chatLoading: false,
  addMessage: (msg) => set((st) => ({ messages: [...st.messages, msg] })),
  setChatLoading: (v) => set({ chatLoading: v }),
  clearChat: () => set({ messages: [] }),

  /* ── Settings ────────────────────────────────── */
  riskDefault: (() => {
    try { return (localStorage.getItem('psx-risk') as RiskLevel) || 'medium'; } catch { return 'medium'; }
  })() as RiskLevel,
  capitalDefault: (() => {
    try { return Number(localStorage.getItem('psx-capital')) || 1000000; } catch { return 1000000; }
  })(),
  modeDefault: (() => {
    try { return (localStorage.getItem('psx-mode') as InvestmentMode) || 'fundamental'; } catch { return 'fundamental'; }
  })() as InvestmentMode,
  theme: (() => {
    try { return (localStorage.getItem('psx-theme') as 'dark' | 'light') || 'dark'; } catch { return 'dark' as const; }
  })(),
  exportLoading: false,
  setRiskDefault: (r) => {
    try { localStorage.setItem('psx-risk', r); } catch {}
    set({ riskDefault: r });
  },
  setCapitalDefault: (c) => {
    try { localStorage.setItem('psx-capital', String(c)); } catch {}
    set({ capitalDefault: c });
  },
  setModeDefault: (m) => {
    try { localStorage.setItem('psx-mode', m); } catch {}
    set({ modeDefault: m });
  },
  toggleTheme: () => set((st) => {
    const next = st.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('psx-theme', next); } catch {}
    return { theme: next };
  }),
  setExportLoading: (v) => set({ exportLoading: v }),
}));
