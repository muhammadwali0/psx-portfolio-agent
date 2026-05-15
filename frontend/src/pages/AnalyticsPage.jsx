import PredictionChart from '@/components/charts/PredictionChart';
import BuySellTrendChart from '@/components/charts/BuySellTrendChart';
import RiskDashboard from '@/components/risk/RiskDashboard';
import PortfolioGrowthChart from '@/components/charts/PortfolioGrowthChart';

export default function AnalyticsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Deep portfolio analytics, predictions & risk management</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PredictionChart />
        <BuySellTrendChart />
      </div>
      <PortfolioGrowthChart />
      <RiskDashboard />
    </div>
  );
}
