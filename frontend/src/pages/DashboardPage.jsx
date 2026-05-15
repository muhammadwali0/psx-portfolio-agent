import { useState, useEffect } from 'react';
import StatsGrid from '@/components/dashboard/StatsGrid';
import PortfolioGrowthChart from '@/components/charts/PortfolioGrowthChart';
import AllocationPieChart from '@/components/charts/AllocationPieChart';
import MarketOverview from '@/components/dashboard/MarketOverview';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import AIRecommendationCard from '@/components/ai/AIRecommendationCard';
import { getMarketSnapshot } from '@/services/api';
import { mockSignals } from '@/data/mockSignals';

export default function DashboardPage() {
  const [market, setMarket] = useState(null);

  useEffect(() => {
    getMarketSnapshot().then(r => setMarket(r.data));
  }, []);

  const topSignals = mockSignals.filter(s => s.confidence >= 0.75).slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">AI-powered portfolio intelligence overview</p>
      </div>

      {/* Stats Grid */}
      <StatsGrid />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PortfolioGrowthChart />
        </div>
        <AllocationPieChart />
      </div>

      {/* Market + AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MarketOverview snapshot={market} />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
            AI Top Recommendations
          </h3>
          {topSignals.map((s, i) => (
            <AIRecommendationCard key={s.ticker} signal={s} index={i} />
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <RecentTransactions />
    </div>
  );
}
