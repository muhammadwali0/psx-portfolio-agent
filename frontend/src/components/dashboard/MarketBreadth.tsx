import GlassCard from '../shared/GlassCard';
import DonutChart from '../shared/DonutChart';
import type { MarketSnapshot } from '../../api/types';

interface Props {
  snapshot: MarketSnapshot;
}

export default function MarketBreadth({ snapshot }: Props) {
  const adv = snapshot.advances || snapshot.board_stats?.advances || 0;
  const dec = snapshot.declines || snapshot.board_stats?.declines || 0;
  const unch = snapshot.unchanged || snapshot.board_stats?.unchanged || 0;
  const total = adv + dec + unch;

  if (total === 0) return null;

  const segments = [
    { value: adv, color: '#00C48C', label: 'Advances' },
    { value: dec, color: '#E63946', label: 'Declines' },
    { value: unch, color: '#52525B', label: 'Unchanged' },
  ];

  return (
    <div>
      <h2 className="text-[11px] font-semibold text-psx-300 uppercase tracking-wider mb-3">Market Breadth</h2>
      <GlassCard padding="lg">
        <div className="flex items-center gap-6">
          <DonutChart
            segments={segments}
            size={110}
            thickness={14}
            centerValue={String(total)}
            centerLabel="Total"
            className="shrink-0"
          />
          <div className="flex-1 space-y-3">
            {[
              { label: 'Advancing', value: adv, pct: (adv / total * 100), color: 'text-profit', barColor: 'bg-profit' },
              { label: 'Declining', value: dec, pct: (dec / total * 100), color: 'text-loss', barColor: 'bg-loss' },
              { label: 'Unchanged', value: unch, pct: (unch / total * 100), color: 'text-psx-300', barColor: 'bg-psx-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-psx-300">{item.label}</span>
                  <span className={`text-[11px] font-financial font-semibold ${item.color}`}>{item.value}</span>
                </div>
                <div className="h-1 bg-psx-500/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.barColor} transition-all duration-700`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
