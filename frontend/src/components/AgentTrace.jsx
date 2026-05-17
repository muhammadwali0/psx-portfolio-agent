import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Newspaper, Brain, GitMerge, PieChart, Check, Loader2, Clock, Terminal, AlertCircle } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Scraping PSX Market', icon: Globe, lines: [
    '→ Connecting to PSX data feeds…',
    '→ Fetching real-time quotes for 100+ securities',
    '→ Parsing volumes, depth, and price action',
    '→ Market data acquisition complete ✓',
  ]},
  { id: 2, title: 'Reading Financial News', icon: Newspaper, lines: [
    '→ Scanning Business Recorder, Dawn Biz, Reuters…',
    '→ Processing macro-economic indicators',
    '→ Analyzing SBP monetary policy updates',
    '→ News corpus compiled ✓',
  ]},
  { id: 3, title: 'Extracting Signals', icon: Brain, lines: [
    '→ Running NLP sentiment analysis pipeline…',
    '→ Detecting bullish / bearish / neutral patterns',
    '→ Computing RSI, MACD, EMA indicators',
    '→ Signal extraction complete ✓',
  ]},
  { id: 4, title: 'Resolving Conflicts', icon: GitMerge, lines: [
    '→ Cross-referencing conflicting signals…',
    '→ Applying Bayesian signal weighting',
    '→ Multi-factor reconciliation engine active',
    '→ Consensus signals generated ✓',
  ]},
  { id: 5, title: 'Constructing Portfolio', icon: PieChart, lines: [
    '→ Initializing portfolio optimizer…',
    '→ Applying MPT constraints & position sizing',
    '→ Setting stop-loss and target levels',
    '→ Portfolio finalized ✓',
  ]},
];

const STEP_MS = 8000;

function Typewriter({ text, speed = 22 }) {
  const [display, setDisplay] = useState('');
  const i = useRef(0);
  useEffect(() => {
    i.current = 0; setDisplay('');
    const iv = setInterval(() => {
      i.current++;
      setDisplay(text.slice(0, i.current));
      if (i.current >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return <span className="font-mono text-xs leading-5">{display}{display.length < text.length && <span className="tw-cursor" />}</span>;
}

function TypingDone({ text, speed, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, text.length * speed + 50);
    return () => clearTimeout(t);
  }, [text, speed, onDone]);
  return null;
}

function StepLog({ step }) {
  const [done, setDone] = useState([]);
  const [cur, setCur] = useState(0);
  useEffect(() => { setDone([]); setCur(0); }, [step.id]);
  const onDone = () => { setDone(prev => [...prev, step.lines[cur]]); setCur(prev => prev + 1); };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="ml-10 sm:ml-12 mt-2">
      <div className="bg-brand-900/95 backdrop-blur-xl rounded-xl p-3.5 terminal-glow">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-2 h-2 rounded-full bg-red-400/80" />
          <span className="w-2 h-2 rounded-full bg-amber-400/80" />
          <span className="w-2 h-2 rounded-full bg-green-400/80" />
          <span className="ml-2 text-[10px] text-slate-500 font-mono">psx-agent — step {step.id}/5</span>
        </div>
        <div className="space-y-0.5 text-emerald-400/90">
          {done.map((l, i) => <div key={i} className="font-mono text-xs opacity-50">{l}</div>)}
          {cur < step.lines.length && (
            <div className="text-emerald-300">
              <Typewriter text={step.lines[cur]} speed={18} key={`${step.id}-${cur}`} />
              <TypingDone text={step.lines[cur]} speed={18} onDone={onDone} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function AgentTrace({ isActive, isCompleted, isError, errorMsg }) {
  const [cur, setCur] = useState(-1);
  const [completed, setCompleted] = useState(new Set());
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(null);
  const timerRef = useRef(null);
  const stepRef = useRef(null);

  useEffect(() => {
    if (isActive) { const t0 = Date.now(); timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000); }
    if (isCompleted || isError) clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isActive, isCompleted, isError]);

  useEffect(() => {
    if (!isActive) return;
    setCur(0); setCompleted(new Set());
    let s = 0;
    const advance = () => { setCompleted(p => new Set([...p, s])); s++; if (s < STEPS.length) { setCur(s); stepRef.current = setTimeout(advance, STEP_MS); } };
    stepRef.current = setTimeout(advance, STEP_MS);
    return () => clearTimeout(stepRef.current);
  }, [isActive]);

  useEffect(() => {
    if (isCompleted) { clearTimeout(stepRef.current); setCompleted(new Set(STEPS.map((_, i) => i))); setCur(STEPS.length); }
  }, [isCompleted]);

  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' }); }, [cur, completed.size]);

  const mm = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const pct = isCompleted ? 100 : Math.min(((completed.size + (cur >= 0 && cur < STEPS.length ? 0.5 : 0)) / STEPS.length) * 100, 99);

  if (!isActive && !isCompleted && !isError) return null;

  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="px-4 pb-6">
      <div className="max-w-lg mx-auto glass-strong rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3.5 border-b border-slate-100/60 dark:border-slate-700/40">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/40' : isError ? 'bg-red-100 dark:bg-red-900/40' : 'bg-indigo-100 dark:bg-indigo-900/40'}`}>
                {isCompleted ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : isError ? <AlertCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" /> : <Terminal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />}
              </div>
              <div>
                <div className="text-sm font-bold text-brand-900 dark:text-white">{isCompleted ? 'Agent Complete' : isError ? 'Agent Error' : 'Agent Running'}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">{isCompleted ? 'All tasks done' : isError ? 'Something went wrong' : 'Analyzing PSX market…'}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono text-slate-400 dark:text-slate-500"><Clock className="w-3 h-3" />{mm(elapsed)}</div>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : isError ? 'bg-red-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>

        <div ref={ref} className="px-5 py-4 max-h-[400px] overflow-y-auto no-scrollbar">
          {STEPS.map((step, i) => {
            const isDone = completed.has(i);
            const isCur = cur === i && !isCompleted;
            const Icon = step.icon;
            return (
              <div key={step.id}>
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: i * 0.04 }} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${isDone ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : isCur ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shadow-glow-sm' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600'}`}>
                      {isDone ? <Check className="w-3.5 h-3.5" /> : isCur ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    {i < STEPS.length - 1 && <div className={`w-px h-5 transition-colors duration-500 ${isDone ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-slate-100 dark:bg-slate-800'}`} />}
                  </div>
                  <div className="pt-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold transition-colors ${isDone ? 'text-emerald-700 dark:text-emerald-400' : isCur ? 'text-brand-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>{step.title}</span>
                      {isDone && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">Done</motion.span>}
                      {isCur && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 animate-pulse">Running</span>}
                    </div>
                  </div>
                </motion.div>
                <AnimatePresence>{isCur && <StepLog step={step} />}</AnimatePresence>
              </div>
            );
          })}

          {isError && errorMsg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400 font-medium flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span>{errorMsg}</span>
            </motion.div>
          )}

          {isCompleted && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-700 dark:text-emerald-400 font-medium text-center">
              ✅ All tasks completed in {mm(elapsed)} — scroll down for results
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
