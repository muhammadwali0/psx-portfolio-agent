import { HiTrendingUp, HiTrendingDown, HiMinus } from 'react-icons/hi';

export default function SentimentIndicator({ sentiment = 'neutral', size = 'md' }) {
  const config = {
    bullish: { icon: HiTrendingUp, text: 'Bullish', color: 'text-neon', bg: 'bg-neon/10', glow: 'shadow-[0_0_12px_rgba(0,255,178,0.2)]' },
    bearish: { icon: HiTrendingDown, text: 'Bearish', color: 'text-red-400', bg: 'bg-red-500/10', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.2)]' },
    neutral: { icon: HiMinus, text: 'Neutral', color: 'text-yellow-400', bg: 'bg-yellow-500/10', glow: '' },
  };

  const s = config[sentiment] || config.neutral;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg ${s.bg} ${s.color} ${s.glow} ${sizeClass} font-semibold`}>
      <s.icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>{s.text}</span>
    </div>
  );
}
