import StatCard from '@/components/common/StatCard';
import { HiOutlineCurrencyDollar, HiOutlineTrendingUp, HiOutlineChartPie, HiOutlineCash } from 'react-icons/hi';
import { mockPortfolio } from '@/data/mockPortfolio';

export default function PortfolioSummary({ portfolio }) {
  const p = portfolio || mockPortfolio;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <StatCard label="Total Invested" value={p.totalInvested} prefix="₨" icon={HiOutlineCurrencyDollar} color="blue" delay={0} />
      <StatCard label="Current Value" value={p.totalValue} prefix="₨" change={p.totalReturnPct} icon={HiOutlineTrendingUp} color="neon" delay={1} />
      <StatCard label="Total Return" value={p.totalReturn} prefix="₨" change={p.totalReturnPct} icon={HiOutlineChartPie} color="purple" delay={2} />
      <StatCard label="Cash Balance" value={p.cashBalance} prefix="₨" suffix="" icon={HiOutlineCash} color="warning" delay={3} />
    </div>
  );
}
