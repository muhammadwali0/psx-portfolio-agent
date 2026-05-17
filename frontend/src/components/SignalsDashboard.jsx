import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Activity, Newspaper, Tag } from 'lucide-react';

const S = {
  bullish:  { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/40', bar: 'bg-emerald-500', Icon: TrendingUp },
  bearish:  { color: 'text-red-500 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/40',                 bar: 'bg-red-500',     Icon: TrendingDown },
  neutral:  { color: 'text-slate-500 dark:text-slate-400',     bg: 'bg-slate-50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-700/40',         bar: 'bg-slate-400',   Icon: Minus },
};
const cfg = (v) => S[String(v || 'neutral').toLowerCase()] || S.neutral;
const up = (d) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: d } });

function SignalCard({ sig, idx }) {
  const tk = String(sig.ticker || sig.symbol || '—');
  const sent = sig.sentiment || sig.signal || sig.direction || 'neutral';
  const conf = sig.confidence ?? sig.score ?? 0;
  const pct = conf > 1 ? conf : conf * 100;
  const hl = String(sig.headline || sig.news || sig.reason || sig.summary || '');
  const src = String(sig.source || '');
  const c = cfg(sent);

  return (
    <motion.div {...up(idx * 0.05)} className={`rounded-xl border p-3.5 ${c.bg} transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/80 dark:bg-slate-800/60 flex items-center justify-center shadow-sm">
            <c.Icon className={`w-3.5 h-3.5 ${c.color}`} />
          </div>
          <div>
            <div className="font-bold text-xs text-brand-900 dark:text-white">{tk}</div>
            <div className={`text-[9px] font-bold uppercase tracking-wider ${c.color}`}>{String(sent).toUpperCase()}</div>
          </div>
        </div>
        <span className={`text-[11px] font-bold ${c.color}`}>{pct.toFixed(0)}%</span>
      </div>

      <div className="h-1 bg-white/50 dark:bg-slate-700/40 rounded-full overflow-hidden mb-2.5">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.6, delay: idx * 0.05 + 0.15 }} className={`h-full rounded-full ${c.bar}`} />
      </div>

      {hl && <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">{hl}</div>}
      {src && <div className="mt-1.5 flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500"><Newspaper className="w-2.5 h-2.5" />{src}</div>}
    </motion.div>
  );
}

export default function SignalsDashboard({ data }) {
  if (!data) return null;
  const p = data.portfolio || data;
  const sigs = p.signals || p.market_signals || p.analysis || [];
  if (!Array.isArray(sigs) || !sigs.length) return null;

  const bull = sigs.filter(s => cfg(s.sentiment || s.signal).Icon === TrendingUp).length;
  const bear = sigs.filter(s => cfg(s.sentiment || s.signal).Icon === TrendingDown).length;
  const neut = sigs.length - bull - bear;
  const tickers = [...new Set(sigs.map(s => s.ticker || s.symbol).filter(Boolean))];

  return (
    <section className="px-4 pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30"><Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
          <h2 className="text-base sm:text-lg font-bold text-brand-900 dark:text-white">Market Signals</h2>
        </div>

        <motion.div {...up(0)} className="glass rounded-2xl p-4 mb-3.5">
          <div className="flex justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sentiment</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{sigs.length} signals</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {bull > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${(bull / sigs.length) * 100}%` }} transition={{ duration: 0.5 }} className="bg-emerald-500 first:rounded-l-full" />}
            {neut > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${(neut / sigs.length) * 100}%` }} transition={{ duration: 0.5, delay: 0.08 }} className="bg-slate-300 dark:bg-slate-600" />}
            {bear > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${(bear / sigs.length) * 100}%` }} transition={{ duration: 0.5, delay: 0.16 }} className="bg-red-400 last:rounded-r-full" />}
          </div>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{bull} Bullish</span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />{neut} Neutral</span>
            <span className="flex items-center gap-1 text-red-500 dark:text-red-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />{bear} Bearish</span>
          </div>
        </motion.div>

        {tickers.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3.5">
            {tickers.map(t => (
              <span key={t} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                <Tag className="w-2.5 h-2.5" />{t}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {sigs.map((s, i) => <SignalCard key={s.ticker || i} sig={s} idx={i} />)}
        </div>
      </div>
    </section>
  );
}
