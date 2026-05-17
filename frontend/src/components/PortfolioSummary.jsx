import { motion } from 'framer-motion';
import { TrendingUp, PieChart, ShieldCheck, DollarSign, BarChart3, Target } from 'lucide-react';
import { useEffect, useState } from 'react';

function Counter({ end, decimals = 0, ms = 1400 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const tick = () => { const p = Math.min((Date.now() - t0) / ms, 1); setV((1 - Math.pow(1 - p, 3)) * end); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, [end, ms]);
  return <>{v.toFixed(decimals)}</>;
}

const up = (d) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: d } });

export default function PortfolioSummary({ data }) {
  if (!data) return null;
  const p = data.portfolio || data;
  const s = p.summary || p.portfolio_summary || p;
  const pos = p.positions || p.holdings || [];

  const sharpe = s.sharpe_ratio ?? s.sharpe ?? null;
  const ret = s.expected_return ?? s.exp_return ?? null;
  const cash = s.cash_percentage ?? s.cash_pct ?? null;
  const risk = s.overall_risk ?? s.risk_level ?? null;
  const count = pos.length || s.total_positions || 0;
  const rationale = s.rationale ?? s.portfolio_rationale ?? s.reasoning ?? null;

  const cards = [
    sharpe != null && { icon: BarChart3, label: 'Sharpe Ratio', val: Number(sharpe), dec: 2, suf: '', c: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
    ret != null && { icon: TrendingUp, label: 'Expected Return', val: Number(ret), dec: 1, suf: '%', c: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
    cash != null && { icon: DollarSign, label: 'Cash Held', val: Number(cash), dec: 1, suf: '%', c: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
    count > 0 && { icon: Target, label: 'Positions', val: count, dec: 0, suf: '', c: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' },
    risk && { icon: ShieldCheck, label: 'Risk Level', text: String(risk).charAt(0).toUpperCase() + String(risk).slice(1), c: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  ].filter(Boolean);

  return (
    <motion.section {...up(0)} className="px-4 pb-5">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30"><PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>
          <h2 className="text-base sm:text-lg font-bold text-brand-900 dark:text-white">Portfolio Overview</h2>
        </div>

        {cards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-4">
            {cards.map((c, i) => (
              <motion.div key={c.label} {...up(i * 0.08)} className="glass rounded-2xl p-3.5 flex flex-col gap-1.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.c}`}><c.icon className="w-3.5 h-3.5" /></div>
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{c.label}</div>
                <div className="text-lg font-bold text-brand-900 dark:text-white">
                  {c.text ? c.text : <Counter end={c.val} decimals={c.dec} />}
                  {c.suf && <span className="text-xs text-slate-400 dark:text-slate-500 ml-0.5">{c.suf}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {rationale && (
          <motion.div {...up(0.3)} className="glass rounded-2xl p-4 sm:p-5">
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">AI Rationale</div>
            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{rationale}</div>
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}
