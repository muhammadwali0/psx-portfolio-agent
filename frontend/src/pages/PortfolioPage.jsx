import PortfolioSummary from '@/components/portfolio/PortfolioSummary';
import HoldingsTable from '@/components/portfolio/HoldingsTable';
import AllocationPieChart from '@/components/charts/AllocationPieChart';
import PortfolioGrowthChart from '@/components/charts/PortfolioGrowthChart';

export default function PortfolioPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Portfolio</h1>
        <p className="text-sm text-slate-500 mt-1">Holdings, allocation & performance</p>
      </div>
      <PortfolioSummary />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><PortfolioGrowthChart /></div>
        <AllocationPieChart />
      </div>
      <HoldingsTable />
    </div>
  );
}
