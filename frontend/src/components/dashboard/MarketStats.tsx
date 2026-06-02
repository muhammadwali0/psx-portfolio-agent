import { BarChart3, Wallet, Layers } from 'lucide-react';
import GlassCard from '../shared/GlassCard';
import type { MarketSnapshot, PrecomputedAggregates } from '../../api/types';
import { mapSector } from '../../utils/sectorMapper';

interface Props {
  snapshot: MarketSnapshot | null;
  aggregates: PrecomputedAggregates | null;
}

export default function MarketStats({ snapshot, aggregates }: Props) {
  const stats = [
    snapshot?.total_volume ? {
      label: 'Total Volume',
      value: formatNumber(snapshot.total_volume),
      icon: BarChart3,
    } : null,
    snapshot?.total_value_mn ? {
      label: 'Traded Value',
      value: `₨${snapshot.total_value_mn.toFixed(0)}M`,
      icon: Wallet,
    } : null,
    aggregates?.sector_performance?.length ? {
      label: 'Active Sectors',
      value: String(aggregates.sector_performance.length),
      icon: Layers,
    } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof BarChart3 }>;

  if (stats.length === 0) return null;

  return (
    <div>
      <h2 className="text-[11px] font-semibold text-psx-300 uppercase tracking-wider mb-3">Market Stats</h2>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <GlassCard key={s.label} padding="sm" variant="premium" hover>
            <s.icon className="w-3.5 h-3.5 text-psx-300 mb-2" />
            <p className="text-[9px] text-psx-300 uppercase tracking-wider mb-0.5">{s.label}</p>
            <p className="text-sm font-financial font-bold text-psx-50">{s.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Sector Performance */}
      {aggregates && aggregates.sector_performance.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[10px] font-semibold text-psx-300 uppercase tracking-wider mb-2">Sector Performance</h3>
          <div className="space-y-1.5">
            {aggregates.sector_performance.slice(0, 6).map((sp) => {
              const isUp = sp.avg_ytd_pct >= 0;
              return (
                <div 
                  key={sp.sector} 
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-surface-secondary border border-psx-500/10 hover:border-psx-500/25 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-medium text-psx-100 truncate">{mapSector(sp.sector)}</span>
                    <span className="text-[9px] text-psx-200">{sp.symbol_count} stocks</span>
                  </div>
                  <span className={`text-[11px] font-financial font-semibold ${isUp ? 'text-profit' : 'text-loss'}`}>
                    {isUp ? '+' : ''}{sp.avg_ytd_pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
