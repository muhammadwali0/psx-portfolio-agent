import { useState } from 'react';
import { motion } from 'framer-motion';
import AIChatPanel from '@/components/ai/AIChatPanel';
import AIRecommendationCard from '@/components/ai/AIRecommendationCard';
import GlowButton from '@/components/common/GlowButton';
import Loader from '@/components/common/Loader';
import { mockSignals } from '@/data/mockSignals';
import { runPortfolio } from '@/services/api';

const traceSteps = [
  { label: 'Fetching PSX market data...', icon: '📊' },
  { label: 'Analyzing financial news...', icon: '📰' },
  { label: 'Generating trading signals...', icon: '⚡' },
  { label: 'Constructing optimized portfolio...', icon: '🏗️' },
  { label: 'Finalizing risk-adjusted allocations...', icon: '✅' },
];

export default function AIAgentPage() {
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [capital, setCapital] = useState(1000000);
  const [risk, setRisk] = useState('medium');

  const handleRun = async () => {
    setRunning(true);
    setCurrentStep(0);
    setResult(null);

    for (let i = 0; i < traceSteps.length; i++) {
      await new Promise(r => setTimeout(r, 1200));
      setCurrentStep(i + 1);
    }

    const res = await runPortfolio({ capital, riskPreference: risk });
    setResult(res.data);
    setRunning(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">AI Agent</h1>
        <p className="text-sm text-slate-500 mt-1">Run the AI reasoning engine & chat with your portfolio assistant</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Agent Runner + Trace */}
        <div className="space-y-4">
          {/* Config */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Agent Configuration</h3>
            <div>
              <label className="text-xs text-slate-500">Capital (PKR)</label>
              <input type="number" value={capital} onChange={e => setCapital(Number(e.target.value))} className="w-full mt-1 bg-dark-800/60 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neon/30 transition-colors font-mono" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Risk Preference</label>
              <select value={risk} onChange={e => setRisk(e.target.value)} className="w-full mt-1 bg-dark-800/60 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neon/30 transition-colors">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <GlowButton onClick={handleRun} disabled={running} loading={running} className="w-full">
              {running ? 'Agent Running...' : '🚀 Run AI Agent'}
            </GlowButton>
          </div>

          {/* Trace Steps */}
          {(running || result) && (
            <div className="glass-card p-5 neon-border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-neon/5 to-transparent opacity-50" />
              <div className="relative z-10">
                <h3 className="text-sm font-semibold text-neon mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-neon animate-pulse" />
                  AI Reasoning Engine
                </h3>
                <div className="space-y-3">
                  {traceSteps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex items-center gap-3"
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i < currentStep ? 'bg-neon/20 text-neon shadow-[0_0_10px_rgba(0,255,178,0.3)]' : i === currentStep && running ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' : 'bg-dark-700 text-slate-600'}`}>
                        {i < currentStep ? '✓' : step.icon}
                      </div>
                      <span className={`text-sm ${i <= currentStep ? 'text-white' : 'text-slate-600'}`}>{step.label}</span>
                    </motion.div>
                  ))}
                </div>
                {running && (
                  <div className="mt-4 w-full h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-neon to-neon-blue rounded-full" animate={{ width: `${(currentStep / traceSteps.length) * 100}%` }} transition={{ duration: 0.5 }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Top AI Signals</h3>
            {mockSignals.slice(0, 4).map((s, i) => (
              <AIRecommendationCard key={s.ticker} signal={s} index={i} />
            ))}
          </div>
        </div>

        {/* Right: Chat Panel */}
        <AIChatPanel />
      </div>
    </div>
  );
}
