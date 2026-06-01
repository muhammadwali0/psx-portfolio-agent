import DonutChart from '../shared/DonutChart';
import GlassCard from '../shared/GlassCard';
import type { PortfolioPosition } from '../../api/types';

const COLORS = ['#22C55E', '#E63946', '#F8F9FA', '#00C48C', '#FB7185', '#A1A1AA', '#34D399', '#EF4444', '#FBBF24', '#71717A'];

interface Props { positions: PortfolioPosition[]; }

export default function AllocationChart({ positions }: Props) {
  const segments = positions.map((p, i) => ({
    value: p.allocation_pct,
    color: COLORS[i % COLORS.length],
    label: p.ticker,
  }));

  const totalInvested = positions.reduce((s, p) => s + p.allocation_pct, 0);

  return (
    <GlassCard padding="lg">
      <h3 className="text-[11px] font-semibold text-psx-300 uppercase tracking-wider mb-4">Allocation</h3>
      <DonutChart
        segments={segments}
        size={160}
        thickness={18}
        centerValue={`${totalInvested.toFixed(0)}%`}
        centerLabel="Invested"
      />
    </GlassCard>
  );
}
