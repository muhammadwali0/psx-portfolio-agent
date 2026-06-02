import DonutChart from '../shared/DonutChart';
import GlassCard from '../shared/GlassCard';
import type { PortfolioPosition } from '../../api/types';
import { useStore } from '../../store/store';

const CONVENTIONAL_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#14B8A6', // Teal
  '#71717A', // Gray
];

const SHARIAH_COLORS = [
  '#D4AF37', // Primary Gold
  '#F4D03F', // Light Gold
  '#C9A227', // Accent Gold
  '#B8860B', // Dark Gold
  '#DAA520', // Goldenrod
  '#9B870C', // Olive Gold
  '#856D0D', // Deep Gold
  '#E6C229', // Yellow-Gold
  '#F3E5AB', // Vanilla
  '#B5A642', // Brass
];

interface Props { positions: PortfolioPosition[]; }

export default function AllocationChart({ positions }: Props) {
  const shariahMode = useStore((s) => s.shariahMode);
  const chartColors = shariahMode ? SHARIAH_COLORS : CONVENTIONAL_COLORS;

  const segments = positions.map((p, i) => ({
    value: p.allocation_pct,
    color: chartColors[i % chartColors.length],
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
