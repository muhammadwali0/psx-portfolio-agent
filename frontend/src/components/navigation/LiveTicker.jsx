import { useLiveTicker } from '@/hooks/useLiveTicker';

export default function LiveTicker() {
  const tickerData = useLiveTicker();

  if (!tickerData.length) return null;

  const doubled = [...tickerData, ...tickerData];

  return (
    <div className="h-8 bg-dark-950/80 border-b border-white/5 overflow-hidden relative">
      <div className="flex items-center h-full animate-ticker whitespace-nowrap">
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-4 text-xs font-mono">
            <span className="font-semibold text-slate-300">{item.symbol}</span>
            <span className="text-slate-400">₨{item.price.toFixed(2)}</span>
            <span className={item.changePct >= 0 ? 'text-neon' : 'text-red-400'}>
              {item.changePct >= 0 ? '▲' : '▼'} {Math.abs(item.changePct).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-dark-950 to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-dark-950 to-transparent z-10" />
    </div>
  );
}
