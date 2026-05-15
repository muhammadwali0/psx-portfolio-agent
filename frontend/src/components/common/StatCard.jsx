import { motion } from 'framer-motion';
import { HiArrowUp, HiArrowDown } from 'react-icons/hi';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

export default function StatCard({ label, value, prefix = '', suffix = '', change, changeLabel = '', icon: Icon, color = 'neon', decimals = 0, delay = 0 }) {
  const animatedValue = useAnimatedCounter(value, 1500, decimals);

  const colorMap = {
    neon: { bg: 'from-neon/10 to-neon/5', text: 'text-neon', icon: 'bg-neon/10 text-neon' },
    blue: { bg: 'from-neon-blue/10 to-neon-blue/5', text: 'text-neon-blue', icon: 'bg-neon-blue/10 text-neon-blue' },
    purple: { bg: 'from-neon-purple/10 to-neon-purple/5', text: 'text-neon-purple', icon: 'bg-neon-purple/10 text-neon-purple' },
    warning: { bg: 'from-warning/10 to-warning/5', text: 'text-warning', icon: 'bg-warning/10 text-warning' },
    danger: { bg: 'from-danger/10 to-danger/5', text: 'text-danger', icon: 'bg-danger/10 text-danger' },
  };

  const c = colorMap[color] || colorMap.neon;
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1, ease: 'easeOut' }}
      whileHover={{ y: -3, scale: 1.01 }}
      className="glass-card p-4 md:p-5 relative overflow-hidden group"
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          {Icon && (
            <div className={`w-8 h-8 rounded-lg ${c.icon} flex items-center justify-center`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-1">
          {prefix && <span className="text-sm text-slate-400 font-medium">{prefix}</span>}
          <span className="text-2xl md:text-3xl font-bold text-white font-number tracking-tight">
            {animatedValue.toLocaleString()}
          </span>
          {suffix && <span className="text-sm text-slate-400 font-medium">{suffix}</span>}
        </div>

        {change !== undefined && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? 'text-neon' : 'text-danger'}`}>
              {isPositive ? <HiArrowUp className="w-3 h-3" /> : <HiArrowDown className="w-3 h-3" />}
              {Math.abs(change).toFixed(2)}%
            </div>
            {changeLabel && <span className="text-xs text-slate-500">{changeLabel}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
