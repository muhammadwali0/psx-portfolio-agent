import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react';
import type { PortfolioPosition } from '../../api/types';
import { useStore } from '../../store/store';

interface Props { position: PortfolioPosition; isFundamental: boolean; }

const RISK_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  low: { text: 'text-profit', bg: 'bg-profit/10', border: 'border-l-profit/30' },
  medium: { text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-l-yellow-400/30' },
  high: { text: 'text-loss', bg: 'bg-loss/10', border: 'border-l-loss/30' },
};

export default function PositionCard({ position: pos, isFundamental }: Props) {
  const [expanded, setExpanded] = useState(false);
  const shariahMode = useStore((s) => s.shariahMode);
  const rc = RISK_STYLES[pos.risk_level] || RISK_STYLES.medium;

  return (
    <div
      className={`card-premium border-l-[3px] ${rc.border} overflow-hidden`}
      style={{ borderLeftStyle: 'solid' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-psx-100"
              style={{
                background: 'var(--glass-card-bg)',
                border: '1px solid var(--glass-card-border)',
              }}
            >
              {pos.ticker.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-psx-50">{pos.ticker}</span>
                {pos.shariah_compliant && shariahMode && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-shariah/10 text-shariah-light font-semibold border border-shariah/10">Halal</span>
                )}
              </div>
              {pos.company_name && <p className="text-[10px] text-psx-400 truncate max-w-[180px]">{pos.company_name}</p>}
            </div>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${rc.bg} ${rc.text}`}>{pos.risk_level}</span>
        </div>

        {/* Allocation bar */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[9px] text-psx-400">Allocation</span>
            <span className="text-[10px] font-financial font-semibold text-psx-100">{(pos.allocation_pct ?? 0).toFixed(1)}%</span>
          </div>
          <div className="h-1 bg-psx-500/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pos.allocation_pct ?? 0, 100)}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary, var(--color-primary)))' }}
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {[
            ['Capital', `₨${(pos.capital_pkr ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`],
            ['Shares', (pos.shares ?? 0).toLocaleString()],
            ['Entry', `₨${(pos.entry_price ?? 0).toFixed(2)}`],
          ].map(([l, v]) => (
            <div key={l} className="bg-psx-800 rounded-lg p-2 text-center border border-psx-500/10">
              <div className="text-[8px] text-psx-400 uppercase">{l}</div>
              <div className="text-[10px] font-financial font-bold text-psx-100 mt-0.5">{v}</div>
            </div>
          ))}
        </div>

        {/* Stop loss / target */}
        {!isFundamental && (pos.stop_loss != null || pos.target_price != null) && (
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {pos.stop_loss != null && (
              <div className="flex items-center gap-1.5 bg-loss/6 rounded-lg p-2 border border-loss/10">
                <TrendingDown className="w-3 h-3 text-loss shrink-0" />
                <div>
                  <div className="text-[8px] text-loss/70">Stop Loss</div>
                  <div className="text-[10px] font-financial font-bold text-loss">₨{pos.stop_loss.toFixed(2)}</div>
                </div>
              </div>
            )}
            {pos.target_price != null && (
              <div className="flex items-center gap-1.5 bg-profit/6 rounded-lg p-2 border border-profit/10">
                <TrendingUp className="w-3 h-3 text-profit shrink-0" />
                <div>
                  <div className="text-[8px] text-profit/70">Target</div>
                  <div className="text-[10px] font-financial font-bold text-profit">₨{pos.target_price.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Expandable justification */}
        {pos.justification && (
          <div className="pt-2 border-t border-psx-500/10">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] font-semibold text-psx-300 hover:text-psx-200 transition-colors"
            >
              AI Justification
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="mt-2 text-[11px] text-psx-300 leading-relaxed">{pos.justification}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
