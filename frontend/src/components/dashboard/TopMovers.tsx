import { useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import GlassCard from '../shared/GlassCard';
import type { MoverQuote } from '../../api/types';
import { stagger } from '../../design/animationTokens';
import { mapSector } from '../../utils/sectorMapper';

interface Props {
  movers: MoverQuote[];
}

export default function TopMovers({ movers }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!movers.length) return null;

  return (
    <div>
      <h2 className="text-[11px] font-semibold text-psx-300 uppercase tracking-wider mb-3">Top Movers</h2>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar snap-x-mandatory pb-2 -mx-5 px-5"
      >
        {movers.slice(0, 10).map((m, i) => {
          const isUp = m.change_pct >= 0;
          return (
            <motion.div
              key={m.symbol}
              className="snap-start shrink-0 w-[150px]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stagger.list * i }}
            >
              <GlassCard padding="md" hover>
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${isUp ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>
                      {m.symbol.slice(0, 2)}
                    </div>
                    {/* Rank badge */}
                    {i < 3 && (
                      <div
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold"
                        style={{
                          background: i === 0 ? '#22C55E' : i === 1 ? '#A1A1AA' : '#4ADE80',
                          color: '#0B0B0C',
                        }}
                      >
                        {i + 1}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-psx-50 truncate">{m.symbol}</p>
                    <p className="text-[9px] text-psx-400 truncate">{mapSector(m.sector) || m.company_name}</p>
                  </div>
                </div>
                <div className="text-sm font-financial font-bold text-psx-50 mb-1">
                  ₨{m.current_price.toFixed(2)}
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-financial font-semibold ${isUp ? 'text-profit' : 'text-loss'}`}>
                  {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {isUp ? '+' : ''}{m.change_pct.toFixed(2)}%
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
