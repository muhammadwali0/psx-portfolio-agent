import { motion } from 'framer-motion';
import Badge from '@/components/common/Badge';
import ConfidenceMeter from '@/components/common/ConfidenceMeter';

export default function AIRecommendationCard({ signal, index = 0 }) {
  const s = signal || { ticker: 'ENGRO', direction: 'bullish', confidence: 0.87, rationale: 'Strong fundamentals with improving margins.' };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card p-4 border-l-2 border-neon/50 hover:border-neon transition-colors relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-neon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 flex items-center gap-4">
        <ConfidenceMeter value={s.confidence} size={48} label="" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-white">{s.ticker}</h4>
            <Badge type={s.direction}>{s.direction}</Badge>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">{s.rationale}</p>
        </div>
      </div>
    </motion.div>
  );
}
