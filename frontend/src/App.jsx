import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { RotateCcw, ArrowUp, Sun, Moon } from 'lucide-react';

import HeroSection from './components/HeroSection';
import InputPanel from './components/InputPanel';
import AgentTrace from './components/AgentTrace';
import PortfolioSummary from './components/PortfolioSummary';
import PortfolioResults from './components/PortfolioResults';
import SignalsDashboard from './components/SignalsDashboard';
import { usePortfolio } from './hooks/usePortfolio';

export default function App() {
  const { status, result, error, progressMessages, runAgent, reset } = usePortfolio();
  const [lastParams, setLastParams] = useState(null);
  const resultsRef = useRef(null);

  // ── Dark mode ────────────────────────────────────────
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('psx-dark');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('psx-dark', String(dark));
  }, [dark]);

  // ── Status helpers ───────────────────────────────────
  const isIdle = status === 'idle';
  const isLoading = status === 'loading';
  const isStreaming = status === 'streaming';
  const isCompleted = status === 'completed';
  const isError = status === 'error';
  const isRunning = isLoading || isStreaming;

  const handleSubmit = (params) => {
    setLastParams(params);
    runAgent(params);
  };

  const handleReset = () => {
    reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isCompleted && resultsRef.current) {
      const t = setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 800);
      return () => clearTimeout(t);
    }
  }, [isCompleted]);

  return (
    <div className="min-h-screen bg-[#f5f7ff] dark:bg-[#0b0f1a] text-brand-900 dark:text-slate-200 transition-colors duration-300">
      {/* Dark mode toggle — fixed top-right */}
      <button
        onClick={() => setDark(!dark)}
        aria-label="Toggle dark mode"
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl glass hover:shadow-glow-sm transition-all duration-300 group"
      >
        <AnimatePresence mode="wait" initial={false}>
          {dark ? (
            <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <Sun className="w-4 h-4 text-amber-400 group-hover:text-amber-300 transition-colors" />
            </motion.div>
          ) : (
            <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <Moon className="w-4 h-4 text-slate-500 group-hover:text-indigo-500 transition-colors" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: dark ? '#1e293b' : '#fff',
            color: dark ? '#e2e8f0' : '#0f172a',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            fontSize: '14px',
            fontWeight: '500',
            padding: '12px 16px',
          },
        }}
      />

      <HeroSection />

      <AnimatePresence>
        {(isIdle || isError) && !isCompleted && (
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4 }}>
            <InputPanel onSubmit={handleSubmit} isLoading={isRunning} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isError && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 pb-6">
            <div className="max-w-lg mx-auto">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-5 text-center">
                <div className="text-sm text-red-600 dark:text-red-400 font-medium mb-3">{error}</div>
                <button onClick={() => lastParams && runAgent(lastParams)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                  <RotateCcw className="w-4 h-4" />Retry
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AgentTrace isActive={isRunning} isCompleted={isCompleted} isError={isError} errorMsg={error} progressMessages={progressMessages} />

      <AnimatePresence>
        {isCompleted && result && (
          <motion.div ref={resultsRef} key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <div className="max-w-3xl mx-auto px-4 py-2">
              <div className="h-px bg-gradient-to-r from-transparent via-indigo-300/30 dark:via-indigo-500/20 to-transparent" />
            </div>
            <PortfolioSummary data={result} />
            <PortfolioResults data={result} />
            <SignalsDashboard data={result} />

            <div className="px-4 pb-10">
              <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
                <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }} onClick={handleReset}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all">
                  <RotateCcw className="w-4 h-4" />Run New Analysis
                </motion.button>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl glass text-slate-600 dark:text-slate-300 font-semibold hover:shadow-md transition-all">
                  <ArrowUp className="w-4 h-4" />Back to Top
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="text-center py-6 sm:py-8 px-4">
        <div className="text-xs text-slate-400 dark:text-slate-500">
          Built for <span className="font-semibold text-indigo-500">AISeekho 2026</span> — Google Antigravity Hackathon
        </div>
        <div className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">PSX Portfolio Agent • AI-Powered Investment Intelligence</div>
      </footer>
    </div>
  );
}