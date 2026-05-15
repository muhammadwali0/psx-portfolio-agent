import { motion } from 'framer-motion';

export default function ConfidenceMeter({ value = 0, size = 80, label = 'Confidence' }) {
  const percentage = Math.round(value * 100);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (pct) => {
    if (pct >= 75) return '#00FFB2';
    if (pct >= 50) return '#00D4FF';
    if (pct >= 25) return '#F59E0B';
    return '#EF4444';
  };

  const color = getColor(percentage);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold font-number" style={{ color }}>
            {percentage}%
          </span>
        </div>
      </div>
      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
    </div>
  );
}
