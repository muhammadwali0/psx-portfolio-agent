import StatCard from '@/components/common/StatCard';
import { HiOutlineCurrencyDollar, HiOutlineTrendingUp, HiOutlineLightningBolt, HiOutlineShieldCheck, HiOutlineChartPie, HiOutlineGlobe } from 'react-icons/hi';
import { mockPortfolio } from '@/data/mockPortfolio';

export default function StatsGrid({ portfolio }) {
  const p = portfolio || mockPortfolio;

  const stats = [
    { label: 'Portfolio Value', value: p.totalValue, prefix: '₨', change: p.dailyPnlPct, changeLabel: 'today', icon: HiOutlineCurrencyDollar, color: 'neon' },
    { label: 'Daily P&L', value: p.dailyPnl, prefix: '₨', change: p.dailyPnlPct, changeLabel: 'today', icon: HiOutlineTrendingUp, color: p.dailyPnl >= 0 ? 'neon' : 'danger' },
    { label: 'AI Confidence', value: 87, suffix: '%', icon: HiOutlineLightningBolt, color: 'purple' },
    { label: 'Risk Level', value: 42, suffix: '/100', icon: HiOutlineShieldCheck, color: 'warning' },
    { label: 'Total Return', value: p.totalReturnPct, suffix: '%', change: p.totalReturnPct, icon: HiOutlineChartPie, color: 'blue', decimals: 2 },
    { label: 'Active Positions', value: p.positions.length, icon: HiOutlineGlobe, color: 'neon' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
      {stats.map((stat, i) => (
        <StatCard key={stat.label} {...stat} delay={i} />
      ))}
    </div>
  );
}
