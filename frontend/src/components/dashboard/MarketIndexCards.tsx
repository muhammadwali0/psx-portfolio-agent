import { TrendingUp, TrendingDown } from 'lucide-react';
import GlassCard from '../shared/GlassCard';
import AnimatedCounter from '../shared/AnimatedCounter';
import type { MarketSnapshot } from '../../api/types';

interface Props {
  snapshot: MarketSnapshot;
}

export default function MarketIndexCards({ snapshot }: Props) {
  const indices = [
    {
      name: 'KSE-100',
      value: snapshot.kse100_index,
      change: snapshot.kse100_change,
      changePct: snapshot.kse100_change_pct,
      primary: true,
    },
    {
      name: 'KSE-30',
      value: snapshot.kse30_index,
      change: 0,
      changePct: 0,
      primary: false,
    },
    ...(snapshot.indices || []).filter(i => i.symbol !== 'KSE100' && i.symbol !== 'KSE30').slice(0, 2).map(i => ({
      name: i.name || i.symbol,
      value: i.current_value,
      change: i.change,
      changePct: i.change_pct,
      primary: false,
    })),
  ].filter(i => i.value > 0);

  return (
    <div>
      <h2 className="text-[11px] font-semibold text-psx-300 uppercase tracking-wider mb-3">Market Indices</h2>
      <div className="grid grid-cols-2 gap-3">
        {indices.map((idx) => {
          const isUp = idx.change >= 0;
          return (
            <GlassCard key={idx.name} padding="md" variant={idx.primary ? 'premium' : 'default'}>
              <div className="relative">
                {/* Subtle glow background for primary card */}
                {idx.primary && (
                  <div
                    className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-30 pointer-events-none"
                    style={{ background: isUp ? 'rgba(0,196,140,0.15)' : 'rgba(230,57,70,0.15)' }}
                  />
                )}
                <p className="text-[10px] font-semibold text-psx-300 uppercase tracking-wider mb-2">{idx.name}</p>
                <div className={`text-xl font-heading font-bold mb-1 ${idx.primary ? 'gradient-text' : 'text-psx-50'}`}>
                  <AnimatedCounter end={idx.value} decimals={0} prefix="" />
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-financial font-semibold ${isUp ? 'text-profit' : 'text-loss'}`}>
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{isUp ? '+' : ''}{idx.changePct.toFixed(2)}%</span>
                  <span className="text-psx-400 ml-1">({isUp ? '+' : ''}{idx.change.toFixed(1)})</span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
