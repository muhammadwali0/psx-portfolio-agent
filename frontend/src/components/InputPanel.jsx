import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, BriefcaseBusiness, Play, Loader2, ShieldCheck, ShieldAlert, Shield, X, Plus } from 'lucide-react';

const RISK = [
  { value: 'low', label: 'Conservative', Icon: ShieldCheck, ring: 'ring-emerald-300 dark:ring-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', activeBg: 'bg-emerald-100 dark:bg-emerald-900/50 ring-2' },
  { value: 'medium', label: 'Balanced', Icon: Shield, ring: 'ring-amber-300 dark:ring-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', activeBg: 'bg-amber-100 dark:bg-amber-900/50 ring-2' },
  { value: 'high', label: 'Aggressive', Icon: ShieldAlert, ring: 'ring-red-300 dark:ring-red-700', bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-500 dark:text-red-400', activeBg: 'bg-red-100 dark:bg-red-900/50 ring-2' },
];

export default function InputPanel({ onSubmit, isLoading }) {
  const [capital, setCapital] = useState('');
  const [positions, setPositions] = useState(3);
  const [risk, setRisk] = useState('medium');
  const [mode, setMode] = useState('fundamental');
  const [tickerInput, setTickerInput] = useState('');
  const [tickers, setTickers] = useState([]);
  const [errors, setErrors] = useState({});

  const fmt = (v) => { const n = v.replace(/\D/g, ''); return n ? Number(n).toLocaleString('en-PK') : ''; };
  const raw = () => Number(capital.replace(/\D/g, ''));

  const addTicker = () => {
    const t = tickerInput.trim().toUpperCase();
    if (t && !tickers.includes(t)) { setTickers([...tickers, t]); setTickerInput(''); }
  };

  const validate = () => {
    const e = {};
    const c = raw();
    if (!c || c < 10000) e.capital = 'Minimum PKR 10,000';
    if (c > 100000000) e.capital = 'Maximum PKR 100,000,000';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate() || isLoading) return;
    onSubmit({ capital_pkr: raw(), max_positions: positions, risk_preference: risk, investment_mode: mode, tickers_filter: tickers });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="px-4 pb-6"
      id="input-panel"
    >
      <div className="max-w-lg mx-auto glass-strong rounded-2xl p-5 sm:p-7">
        <h2 className="text-base sm:text-lg font-bold text-brand-900 dark:text-white mb-5">Configure Portfolio</h2>

        <form onSubmit={submit} className="space-y-5">
          {/* Capital */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Capital (PKR)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-300 dark:text-slate-500">PKR</span>
              <input
                type="text" inputMode="numeric" value={capital}
                onChange={(e) => setCapital(fmt(e.target.value))}
                placeholder="1,000,000"
                className={`w-full pl-12 pr-4 py-3 rounded-xl bg-white/60 dark:bg-slate-800/50 border text-base font-semibold text-brand-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 focus:border-indigo-400 dark:focus:border-indigo-500 transition ${errors.capital ? 'border-red-300' : 'border-slate-200/80 dark:border-slate-700/60'}`}
              />
            </div>
            {errors.capital && <div className="mt-1 text-[11px] text-red-500 font-medium">{errors.capital}</div>}
          </div>

          {/* Slider */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Max Positions — <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">{positions}</span>
            </label>
            <input type="range" min={1} max={15} value={positions} onChange={(e) => setPositions(+e.target.value)} className="w-full" />
            <div className="relative text-[10px] text-slate-300 dark:text-slate-600 mt-0.5 h-4">
              <span className="absolute left-[28.57%] -translate-x-1/2">5</span>
              <span className="absolute left-[64.29%] -translate-x-1/2">10</span>
              <span className="absolute left-[100%] -translate-x-1/2">15</span>
            </div>
          </div>

          {/* Risk */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Risk Preference</label>
            <div className="grid grid-cols-3 gap-2">
              {RISK.map((r) => (
                <button
                  key={r.value} type="button" onClick={() => setRisk(r.value)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all duration-200 ${risk === r.value ? `${r.activeBg} ${r.ring} border-transparent` : `${r.bg} border-transparent`}`}
                >
                  <r.Icon className={`w-5 h-5 ${r.text}`} />
                  <span className={`text-[11px] font-semibold ${r.text}`}>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Investment Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('fundamental')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${mode === 'fundamental' ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 ring-2 ring-sky-300 dark:ring-sky-700 border-transparent' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-transparent'}`}
              >
                <BriefcaseBusiness className="w-4 h-4" />
                Fundamental
              </button>
              <button
                type="button"
                onClick={() => setMode('tactical')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${mode === 'tactical' ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 ring-2 ring-rose-300 dark:ring-rose-700 border-transparent' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-transparent'}`}
              >
                <Activity className="w-4 h-4" />
                Tactical
              </button>
            </div>
          </div>

          {/* Tickers */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Filter Tickers <span className="text-slate-300 dark:text-slate-600 font-normal normal-case">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text" value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTicker())}
                placeholder="e.g. OGDC"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-sm font-medium text-brand-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 transition"
              />
              <button type="button" onClick={addTicker} className="px-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tickers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tickers.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    {t}
                    <button type="button" onClick={() => setTickers(tickers.filter(x => x !== t))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <motion.button
            type="submit" disabled={isLoading}
            whileHover={!isLoading ? { scale: 1.015 } : {}}
            whileTap={!isLoading ? { scale: 0.985 } : {}}
            className={`w-full py-3.5 sm:py-4 rounded-2xl font-bold text-[15px] text-white transition-all duration-300 cursor-pointer ${isLoading ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30'}`}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing…</span>
            ) : (
              <span className="inline-flex items-center gap-2"><Play className="w-4 h-4" />Run AI Agent</span>
            )}
          </motion.button>
        </form>
      </div>
    </motion.section>
  );
}
