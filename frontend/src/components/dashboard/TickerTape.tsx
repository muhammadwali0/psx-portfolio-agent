import type { StockQuote } from '../../api/types';

interface Props {
  quotes: StockQuote[];
}

export default function TickerTape({ quotes }: Props) {
  const top = quotes
    .filter((q) => q.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 20);

  if (top.length === 0) return null;

  const items = [...top, ...top]; // duplicate for seamless loop

  return (
    <div className="w-full overflow-hidden border-b border-psx-500/10" style={{ background: 'rgba(34,197,94,0.015)' }}>
      <div className="ticker-tape animate-ticker py-2.5 gap-6">
        {items.map((q, i) => {
          const isUp = q.change >= 0;
          return (
            <div key={`${q.symbol}-${i}`} className="flex items-center gap-2 shrink-0 px-1">
              <span className="text-[11px] font-semibold text-psx-100 whitespace-nowrap">
                {q.symbol}
              </span>
              <span className="text-[11px] font-financial text-psx-200 whitespace-nowrap">
                ₨{q.current_price.toFixed(2)}
              </span>
              <span
                className={`text-[10px] font-financial font-semibold whitespace-nowrap ${isUp ? 'text-profit' : 'text-loss'}`}
              >
                {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{q.change_pct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
