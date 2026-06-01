import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown } from 'lucide-react';
import GlassCard from '../shared/GlassCard';

interface Props { reasoning: string; }

export default function AIReasoningTrace({ reasoning }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!reasoning) return null;
  
  const preview = reasoning.slice(0, 200);

  return (
    <GlassCard padding="md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-psx-600 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-psx-300" />
          </div>
          <span className="text-[11px] font-semibold text-psx-200">AI Reasoning Trace</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-psx-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-3 rounded-lg bg-surface-primary/80 border border-psx-500/10">
              <pre className="text-[10px] font-mono text-psx-300 leading-relaxed whitespace-pre-wrap break-words">
                {reasoning}
              </pre>
            </div>
          </motion.div>
        ) : (
          <p className="mt-2 text-[10px] text-psx-400 line-clamp-2">{preview}…</p>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
