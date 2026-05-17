import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, Layers, Wallet } from 'lucide-react';

const RISK_CLS = {
  low: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  medium: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  high: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};
const up = (d) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: d } });

function Card({ pos, idx }) {
  const [open, setOpen] = useState(false);
  const tk = String(pos.ticker || pos.symbol || '—');
  const co = String(pos.company_name || pos.company || pos.name || '');
  const sec = String(pos.sector || pos.industry || '');
  const alloc = Number(pos.allocation_pct ?? pos.allocation ?? pos.weight ?? 0);
  const cap = Number(pos.capital_pkr ?? pos.amount ?? 0);
  const shares = Number(pos.shares ?? pos.quantity ?? 0);
  const entry = Number(pos.entry_price ?? pos.price ?? 0);
  const sl = pos.stop_loss ?? pos.stoploss ?? null;
  const tp = pos.target_price ?? pos.target ?? null;
  const risk = String(pos.risk_level ?? pos.risk ?? 'medium').toLowerCase();
  const just = String(pos.justification ?? pos.reasoning ?? pos.rationale ?? '');
  const rc = RISK_CLS[risk] || RISK_CLS.medium;

  return (
    <motion.div {...up(idx * 0.07)} className="glass rounded-2xl p-4 sm:p-5 hover:shadow-glass-lg transition-shadow duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">{tk.slice(0, 2)}</div>
          <div className="min-w-0">
            <div className="font-bold text-brand-900 dark:text-white text-sm truncate">{tk}</div>
            {co && <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{co}</div>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {sec && <span className="hidden sm:inline text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">{sec}</span>}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${rc}`}>{risk.charAt(0).toUpperCase() + risk.slice(1)}</span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Allocation</span>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{alloc.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(alloc, 100)}%` }} transition={{ duration: 0.7, delay: idx * 0.07 + 0.2, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          ['Capital', `₨${cap.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`],
          ['Shares', shares.toLocaleString()],
          ['Entry', `₨${entry.toFixed(2)}`],
        ].map(([l, v]) => (
          <div key={l} className="bg-slate-50/80 dark:bg-slate-800/40 rounded-lg p-2 text-center">
            <div className="text-[9px] text-slate-400 dark:text-slate-500">{l}</div>
            <div className="text-[11px] sm:text-xs font-bold text-brand-900 dark:text-white mt-0.5">{v}</div>
          </div>
        ))}
      </div>

      {(sl != null || tp != null) && (
        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
          {sl != null && (
            <div className="flex items-center gap-1.5 bg-red-50/70 dark:bg-red-900/20 rounded-lg p-2">
              <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
              <div>
                <div className="text-[9px] text-red-400">Stop Loss</div>
                <div className="text-[11px] font-bold text-red-600 dark:text-red-400">₨{Number(sl).toFixed(2)}</div>
              </div>
            </div>
          )}
          {tp != null && (
            <div className="flex items-center gap-1.5 bg-emerald-50/70 dark:bg-emerald-900/20 rounded-lg p-2">
              <TrendingUp className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="text-[9px] text-emerald-400">Target</div>
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">₨{Number(tp).toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {sec && <div className="sm:hidden mt-2"><span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">{sec}</span></div>}

      {just && (
        <div className="mt-3 pt-3 border-t border-slate-100/80 dark:border-slate-700/40">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            AI Justification
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{just}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default function PortfolioResults({ data }) {
  if (!data) return null;
  const p = data.portfolio || data;
  const pos = p.positions || p.holdings || [];
  if (!Array.isArray(pos) || !pos.length) {
    return (
      <div className="px-4 pb-6 text-center py-10">
        <Layers className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
        <div className="text-sm text-slate-400 dark:text-slate-500">No positions found.</div>
      </div>
    );
  }

  return (
    <section className="px-4 pb-5">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/30"><Wallet className="w-4 h-4 text-violet-600 dark:text-violet-400" /></div>
          <h2 className="text-base sm:text-lg font-bold text-brand-900 dark:text-white">Positions</h2>
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">{pos.length} stocks</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pos.map((p, i) => <Card key={p.ticker || p.symbol || i} pos={p} idx={i} />)}
        </div>
      </div>
    </section>
  );
}
