import StatCard from '@/components/common/StatCard';
import RiskHeatmap from '@/components/charts/RiskHeatmap';
import { HiOutlineShieldCheck, HiOutlineChartBar, HiOutlineExclamation, HiOutlineScale } from 'react-icons/hi';

export default function RiskDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Portfolio VaR" value={3.2} suffix="%" icon={HiOutlineExclamation} color="warning" delay={0} decimals={1} />
        <StatCard label="Sharpe Ratio" value={1.85} icon={HiOutlineScale} color="neon" delay={1} decimals={2} />
        <StatCard label="Max Drawdown" value={8.4} suffix="%" icon={HiOutlineChartBar} color="danger" delay={2} decimals={1} />
        <StatCard label="Diversification" value={78} suffix="/100" icon={HiOutlineShieldCheck} color="blue" delay={3} />
      </div>
      <RiskHeatmap />
    </div>
  );
}
