import { motion } from 'framer-motion';
import Badge from '@/components/common/Badge';
import ConfidenceMeter from '@/components/common/ConfidenceMeter';

export default function SignalCard({ signal, index = 0 }) {
  const sourceLabels = {
    psx_market: 'PSX Data',
    dawn_business: 'Dawn News',
    ary_business: 'ARY News',
    geo_business: 'Geo News',
    gemini_reasoning: 'AI Engine',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      whileHover={{ y: -3, scale: 1.01 }}
      className="glass-card p-4 md:p-5 relative overflow-hidden group"
    >
      {/* Glow effect on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
        signal.direction === 'bullish' ? 'bg-gradient-to-br from-neon/5 to-transparent' :
        signal.direction === 'bearish' ? 'bg-gradient-to-br from-red-500/5 to-transparent' :
        'bg-gradient-to-br from-yellow-500/5 to-transparent'
      }`} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-lg font-bold text-white">{signal.ticker}</h4>
            <span className="text-[10px] text-slate-500">{sourceLabels[signal.source] || signal.source}</span>
          </div>
          <ConfidenceMeter value={signal.confidence} size={56} label="" />
        </div>

        <div className="mb-3">
          <Badge type={signal.direction}>{signal.direction}</Badge>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{signal.rationale}</p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <span className="text-[10px] text-slate-500 font-mono">
            {signal.confidence >= 0.8 ? '🔥 High Conviction' : signal.confidence >= 0.6 ? '📊 Moderate' : '⚡ Speculative'}
          </span>
          <span className="text-[10px] text-slate-600">
            {new Date(signal.extracted_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
