import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/store';
import { startPortfolioRun, getPortfolioStatus, createPortfolioStream } from '../api/portfolioApi';
import { extractError } from '../api/api';
import CapitalInput from '../components/portfolio/CapitalInput';
import RiskSelector from '../components/portfolio/RiskSelector';
import ModeSelector from '../components/portfolio/ModeSelector';
import GenerateButton from '../components/portfolio/GenerateButton';
import SSEProgressTracker from '../components/portfolio/SSEProgressTracker';
import AllocationChart from '../components/portfolio/AllocationChart';
import PositionCard from '../components/portfolio/PositionCard';
import AIReasoningTrace from '../components/portfolio/AIReasoningTrace';
import ScenarioSimulator from '../components/portfolio/ScenarioSimulator';
import PortfolioExport from '../components/portfolio/PortfolioExport';
import type { RiskLevel, InvestmentMode, RunPortfolioRequest, AgentRun } from '../api/types';
import { stagger } from '../design/animationTokens';

export default function PortfolioScreen() {
  const {
    portfolioStatus, portfolioResult, portfolioError, progressMessages,
    setPortfolioStatus, setPortfolioResult, setPortfolioError, addProgressMessage, resetPortfolio,
    riskDefault, capitalDefault, modeDefault, shariahMode,
  } = useStore();

  const [capital, setCapital] = useState(capitalDefault);
  const [positions, setPositions] = useState(5);
  const [risk, setRisk] = useState<RiskLevel>(riskDefault);
  const [mode, setMode] = useState<InvestmentMode>(modeDefault);
  const eventSourceRef = useRef<{ close: () => void } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isIdle = portfolioStatus === 'idle';
  const isRunning = portfolioStatus === 'loading' || portfolioStatus === 'streaming';
  const isCompleted = portfolioStatus === 'completed';
  const isError = portfolioStatus === 'error';

  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  const connectSSE = useCallback((runId: string) => {
    timeoutRef.current = setTimeout(() => {
      closeSSE();
      setPortfolioError('Request timed out. Please try again.');
      setPortfolioStatus('error');
    }, 180_000);

    let isFallingBack = false;
    const triggerFallback = async () => {
      if (isFallingBack) return;
      isFallingBack = true;
      closeSSE();
      try {
        const data = await getPortfolioStatus(runId);
        setPortfolioResult(data);
        setPortfolioStatus('completed');
      } catch {
        setPortfolioError('Failed to fetch results.');
        setPortfolioStatus('error');
      }
    };

    const stream = createPortfolioStream(
      runId,
      async (msg) => {
        if (msg === 'COMPLETE') {
          await triggerFallback();
          return;
        }
        if (msg.startsWith('FAILED:')) {
          console.warn('Backend stream failed, triggering fallback:', msg);
          await triggerFallback();
          return;
        }
        addProgressMessage(msg);
      },
      async (err) => {
        console.warn('SSE stream error, triggering fallback:', err);
        await triggerFallback();
      }
    );
    eventSourceRef.current = stream;
  }, [closeSSE, setPortfolioError, setPortfolioStatus, setPortfolioResult, addProgressMessage]);

  const handleGenerate = useCallback(async () => {
    resetPortfolio();
    setPortfolioStatus('loading');

    try {
      const params: RunPortfolioRequest = {
        capital_pkr: capital,
        max_positions: positions,
        risk_preference: risk,
        investment_mode: mode,
        shariah_mode: shariahMode,
        tickers_filter: [],
      };
      const data = await startPortfolioRun(params);
      if (!data.run_id) throw new Error('No run_id received');
      setPortfolioStatus('streaming');
      connectSSE(data.run_id);
    } catch (err) {
      setPortfolioError(extractError(err));
      setPortfolioStatus('error');
    }
  }, [capital, positions, risk, mode, shariahMode, resetPortfolio, setPortfolioStatus, setPortfolioError, connectSSE]);

  useEffect(() => {
    if (isCompleted && resultsRef.current) {
      const t = setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 600);
      return () => clearTimeout(t);
    }
  }, [isCompleted]);

  useEffect(() => {
    return () => closeSSE();
  }, [closeSSE]);

  const portfolio = portfolioResult?.portfolio;
  const pPositions = portfolio?.positions || [];

  return (
    <div className="pb-10">
      {/* Configuration Panel */}
      <AnimatePresence>
        {(isIdle || isError) && !isCompleted && (
          <motion.div
            key="config"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="section-px py-5 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-psx-50">Build Portfolio</h2>
            </div>
            
            <CapitalInput value={capital} onChange={setCapital} />
            
            <div>
              <label className="block text-[10px] font-semibold text-psx-300 uppercase tracking-wider mb-2">
                Max Positions — <span className="text-psx-50 font-bold text-xs">{positions}</span>
              </label>
              <input
                type="range" min={1} max={15} value={positions}
                onChange={(e) => setPositions(+e.target.value)}
                className="w-full"
              />
            </div>

            <RiskSelector value={risk} onChange={setRisk} />
            <ModeSelector value={mode} onChange={setMode} />
            <GenerateButton onClick={handleGenerate} loading={isRunning} />

            {isError && portfolioError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-loss/8 border border-loss/20 text-xs text-loss font-medium text-center"
              >
                {portfolioError}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SSE Progress */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="section-px py-5"
          >
            <SSEProgressTracker
              progressMessages={progressMessages}
              isCompleted={false}
              isError={isError}
              errorMsg={portfolioError}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {isCompleted && portfolio && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Summary stats */}
            <div className="section-px py-5">
              <h2 className="text-lg font-heading font-bold text-psx-50 mb-4">Your Portfolio</h2>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {[
                  { 
                    label: 'Portfolio Value', 
                    value: `₨${(portfolio.total_capital_pkr || capital).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`,
                    color: 'text-blue-500 dark:text-blue-400',
                    border: 'border-t-blue-500/30'
                  },
                  portfolio.expected_return_pct != null && { 
                    label: 'Expected Return', 
                    value: `${portfolio.expected_return_pct.toFixed(1)}%`,
                    color: 'text-purple-500 dark:text-purple-400',
                    border: 'border-t-purple-500/30'
                  },
                  { 
                    label: 'Diversification', 
                    value: `${(100 - (portfolio.cash_pct ?? 0)).toFixed(0)}% Equities`,
                    color: 'text-cyan-500 dark:text-cyan-400',
                    border: 'border-t-cyan-500/30'
                  },
                  portfolio.sharpe_ratio != null && { 
                    label: 'Risk (Sharpe)', 
                    value: portfolio.sharpe_ratio.toFixed(2),
                    color: 'text-amber-500 dark:text-amber-400',
                    border: 'border-t-amber-500/30'
                  },
                  { 
                    label: 'Performance', 
                    value: 'Optimal',
                    color: 'text-emerald-500 dark:text-emerald-400',
                    border: 'border-t-emerald-500/30'
                  },
                  shariahMode && { 
                    label: 'Shariah Metrics', 
                    value: '100% Halal',
                    color: 'text-gold-light',
                    border: 'border-t-gold/35'
                  },
                ].filter(Boolean).map((s: any) => (
                  <div key={s.label} className={`glass-card p-3 rounded-xl border-t-2 ${s.border}`}>
                    <p className="text-[9px] text-psx-400 uppercase tracking-wider mb-1">{s.label}</p>
                    <p className={`text-lg font-financial font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Allocation Chart */}
              {pPositions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: stagger.normal * 2 }}
                >
                  <AllocationChart positions={pPositions} />
                </motion.div>
              )}
            </div>

            {/* Positions */}
            <div className="section-px py-3">
              <h3 className="text-[11px] font-semibold text-psx-300 uppercase tracking-wider mb-3">
                Positions • {pPositions.length} stocks
              </h3>
              <div className="space-y-3">
                {pPositions.map((pos, i) => (
                  <motion.div
                    key={pos.ticker}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: stagger.list * i }}
                  >
                    <PositionCard position={pos} isFundamental={mode === 'fundamental'} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* AI Reasoning */}
            {portfolioResult?.gemini_reasoning && (
              <div className="section-px py-3">
                <AIReasoningTrace reasoning={portfolioResult.gemini_reasoning} />
              </div>
            )}

            {/* Scenario Simulator */}
            {pPositions.length > 0 && (
              <div className="section-px py-3">
                <ScenarioSimulator positions={pPositions} />
              </div>
            )}

            {/* Export Section */}
            {portfolioResult && (
              <div className="section-px py-4">
                <h3 className="text-[11px] font-semibold text-psx-300 uppercase tracking-wider mb-3">Export Report</h3>
                <PortfolioExport run={portfolioResult} />
              </div>
            )}

            {/* Reset button */}
            <div className="section-px pt-3 pb-10">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { resetPortfolio(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-full py-3.5 rounded-2xl glass-strong text-sm font-semibold text-psx-100 hover:bg-psx-500/10 transition-colors"
              >
                Run New Analysis
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
