import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import GlassCard from '../shared/GlassCard';
import { runScenario } from '../../api/portfolioApi';
import { extractError } from '../../api/api';
import type { PortfolioPosition, PortfolioScenarioReport } from '../../api/types';

interface Props { positions: PortfolioPosition[]; }

export default function ScenarioSimulator({ positions }: Props) {
  const [report, setReport] = useState<PortfolioScenarioReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const simulate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const symbols = positions.map((p) => p.ticker);
      const weights: Record<string, number> = {};
      positions.forEach((p) => { weights[p.ticker] = p.allocation_pct / 100; });
      const data = await runScenario(symbols, weights);
      setReport(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [positions]);

  return (
    <div>
      <h3 className="text-[11px] font-semibold text-psx-300 uppercase tracking-wider mb-3">Stress Test</h3>
      
      {!report ? (
        <GlassCard padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-loss/8 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-loss" />
            </div>
            <div>
              <p className="text-xs font-semibold text-psx-100">Scenario Simulator</p>
              <p className="text-[10px] text-psx-400">Volatility-based stress test</p>
            </div>
          </div>
          {error && <p className="text-[10px] text-loss mb-2">{error}</p>}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={simulate}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-psx-800 border border-psx-500/10 text-[11px] font-semibold text-psx-100 hover:bg-psx-700/50 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Run Stress Test'}
          </motion.button>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {/* Portfolio-level drawdowns */}
          <div className="grid grid-cols-2 gap-2">
            {report.portfolio_mild_drawdown_pct != null && (
              <GlassCard padding="sm">
                <p className="text-[8px] text-psx-400 uppercase mb-1">Mild Shock (−1σ)</p>
                <p className="text-sm font-financial font-bold text-amber-500 dark:text-yellow-400">{report.portfolio_mild_drawdown_pct.toFixed(2)}%</p>
              </GlassCard>
            )}
            {report.portfolio_severe_drawdown_pct != null && (
              <GlassCard padding="sm">
                <p className="text-[8px] text-psx-400 uppercase mb-1">Severe Shock (−2σ)</p>
                <p className="text-sm font-financial font-bold text-loss">{report.portfolio_severe_drawdown_pct.toFixed(2)}%</p>
              </GlassCard>
            )}
          </div>
          {/* Per-symbol */}
          {report.scenarios.map((s) => (
            <div key={s.symbol} className="flex items-center justify-between py-2 px-3 rounded-lg bg-psx-800 border border-psx-500/5">
              <span className="text-[11px] font-semibold text-psx-200">{s.symbol}</span>
              <div className="flex gap-4 text-[10px] font-financial">
                <span className="text-yellow-400">−1σ: ₨{s.mild_price.toFixed(0)}</span>
                <span className="text-loss">−2σ: ₨{s.severe_price.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
