import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Newspaper, Brain, GitMerge, PieChart, Check, Loader2, Clock, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/store';

const STEPS = [
  { id: 1, title: 'Scraping PSX Market', icon: Globe, trigger: 'Fetching market data...', detail: 'Real-time quotes & KSE-100 index' },
  { id: 2, title: 'Reading Financial News', icon: Newspaper, trigger: 'Fetching market data...', detail: 'Scanning Dawn, ARY & Geo' },
  { id: 3, title: 'Extracting Signals', icon: Brain, trigger: 'Analyzing signals...', detail: 'NLP sentiment & technical analysis' },
  { id: 4, title: 'Resolving Conflicts', icon: GitMerge, trigger: 'Resolving contradictions...', detail: 'Bayesian signal weighting' },
  { id: 5, title: 'Constructing Portfolio', icon: PieChart, trigger: 'Building portfolio...', detail: 'Gemini + Modern Portfolio Theory' },
];

function messageToStep(msg: string): number {
  if (msg === 'Building portfolio...') return 5;
  if (msg === 'Resolving contradictions...') return 4;
  if (msg === 'Analyzing signals...') return 3;
  if (msg === 'Fetching market data...') return 1;
  return 0;
}

interface Props {
  progressMessages: string[];
  isCompleted: boolean;
  isError: boolean;
  errorMsg: string | null;
}

export default function SSEProgressTracker({ progressMessages, isCompleted, isError, errorMsg }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const shariahMode = useStore((s) => s.shariahMode);
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const t0 = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (isCompleted || isError) clearInterval(timerRef.current);
  }, [isCompleted, isError]);

  const currentStep = useMemo(() => {
    let max = 0;
    for (const msg of progressMessages) {
      const s = messageToStep(msg);
      if (s > max) max = s;
    }
    return max;
  }, [progressMessages]);

  const completedSteps = useMemo(() => {
    const set = new Set<number>();
    if (isCompleted) { STEPS.forEach((_, i) => set.add(i)); return set; }
    for (let i = 0; i < STEPS.length; i++) {
      const num = STEPS[i].id;
      if (num < currentStep) set.add(i);
      if (num <= 2 && currentStep >= 3) set.add(i);
    }
    return set;
  }, [currentStep, isCompleted]);

  const pct = isCompleted ? 100 : Math.min(((completedSteps.size + (currentStep > 0 ? 0.5 : 0)) / STEPS.length) * 100, 99);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [progressMessages.length]);

  const mm = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="glass-strong rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-psx-500/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCompleted ? 'bg-profit/10' : isError ? 'bg-loss/10' : 'bg-surface-elevated border border-psx-500/10'}`}>
              {isCompleted ? (
                <Check className="w-3.5 h-3.5 text-profit" />
              ) : isError ? (
                <AlertCircle className="w-3.5 h-3.5 text-loss" />
              ) : (
                <Loader2 className={`w-3.5 h-3.5 animate-spin ${shariahMode ? 'text-shariah-light' : 'text-psx-50'}`} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-psx-50">{isCompleted ? 'Complete' : isError ? 'Error' : 'Building…'}</p>
              <p className="text-[10px] text-psx-300">{isCompleted ? 'Portfolio ready' : isError ? 'Something went wrong' : 'Live SSE progress'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-financial text-psx-300">
            <Clock className="w-3 h-3" />{mm(elapsed)}
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 bg-psx-500/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isCompleted ? 'bg-profit' : isError ? 'bg-loss' : (shariahMode ? 'bg-shariah' : 'bg-psx-50')}`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Steps */}
      <div ref={scrollRef} className="px-5 py-4 max-h-[350px] overflow-y-auto no-scrollbar">
        {STEPS.map((step, i) => {
          const isDone = completedSteps.has(i);
          const isCur = currentStep === step.id && !isDone && !isCompleted;
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-start gap-3 mb-0.5">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-500 ${isDone ? 'bg-profit/10 text-profit' : isCur ? (shariahMode ? 'bg-shariah/10 text-shariah-light' : 'bg-psx-100 text-psx-50') : 'bg-surface-card text-psx-300'}`}>
                  {isDone ? <Check className="w-3 h-3" /> : isCur ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
                </div>
                {i < STEPS.length - 1 && <div className={`w-px h-4 ${isDone ? 'bg-profit/20' : 'bg-psx-500/10'}`} />}
              </div>
              <div className="pt-1">
                <span className={`text-[12px] font-semibold ${isDone ? 'text-profit' : isCur ? (shariahMode ? 'text-shariah-light' : 'text-psx-50') : 'text-psx-200'}`}>
                  {step.title}
                </span>
                {isCur && <p className="text-[10px] text-psx-300 mt-0.5">{step.detail}</p>}
              </div>
            </div>
          );
        })}

        {isError && errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-loss/8 border border-loss/20 text-[11px] text-loss font-medium">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
