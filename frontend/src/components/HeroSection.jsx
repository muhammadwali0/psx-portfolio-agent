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

        {/* GitHub Link */}
        <div className="mt-6 flex justify-center">
          <motion.a
            {...fadeUp(0.32)}
            href="https://github.com/muhammadwali0/psx-portfolio-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            GitHub
          </motion.a>
        </div>
      </div>
    </section>
  );
}
