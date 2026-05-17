import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Brain } from 'lucide-react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-10 pb-6 px-5 sm:pt-20 sm:pb-10">
      {/* Blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-72 h-72 sm:w-[28rem] sm:h-[28rem] rounded-full bg-indigo-200/30 dark:bg-indigo-500/10 blur-3xl animate-blob" />
        <div className="absolute top-32 -right-20 w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-violet-200/25 dark:bg-violet-500/8 blur-3xl animate-blob-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-20 left-1/3 w-56 h-56 sm:w-80 sm:h-80 rounded-full bg-blue-200/20 dark:bg-blue-500/8 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
      </div>

      <div className="max-w-3xl mx-auto text-center">
        {/* Live badge */}
        <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-5 sm:mb-7">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-ring" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">AI Agent Online</span>
        </motion.div>

        {/* Title */}
        <motion.h1 {...fadeUp(0.08)} className="text-[2.5rem] leading-[1.1] sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-4 sm:mb-5">
          <span className="text-brand-900 dark:text-white">PSX Portfolio</span>
          <br />
          <span className="gradient-text">Agent</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p {...fadeUp(0.16)} className="text-sm sm:text-lg text-slate-400 dark:text-slate-400 max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed">
          AI-powered portfolio intelligence for the Pakistan Stock Exchange.
          <span className="hidden sm:inline"> Real-time market analysis, sentiment extraction, and optimized allocation — in seconds.</span>
        </motion.p>

        {/* Feature pills */}
        <motion.div {...fadeUp(0.24)} className="flex flex-wrap justify-center gap-2">
          {[
            { icon: Brain, text: 'AI-Driven Analysis' },
            { icon: TrendingUp, text: 'Real-Time Signals' },
            { icon: Sparkles, text: 'Smart Allocation' },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-xs font-medium text-slate-500 dark:text-slate-400">
              <Icon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              {text}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
