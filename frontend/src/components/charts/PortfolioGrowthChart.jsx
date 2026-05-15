import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { mockChartData } from '@/data/mockCharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 border border-white/10 !rounded-lg">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: ₨{(p.value / 1000000).toFixed(2)}M
        </p>
      ))}
    </div>
  );
};

export default function PortfolioGrowthChart({ data }) {
  const chartData = data || mockChartData.portfolioGrowth;

  return (
    <div className="glass-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Portfolio Growth</h3>
          <p className="text-xs text-slate-500 mt-0.5">vs KSE-100 Benchmark</p>
        </div>
        <div className="flex gap-3">
          {['1M', '3M', '6M', '1Y'].map((t) => (
            <button key={t} className={`text-[10px] font-semibold px-2 py-1 rounded ${t === '1Y' ? 'bg-neon/10 text-neon' : 'text-slate-500 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00FFB2" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#00FFB2" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="benchmarkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#475569" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="benchmark" name="KSE-100" stroke="#475569" fill="url(#benchmarkGrad)" strokeWidth={1.5} strokeDasharray="4 4" />
          <Area type="monotone" dataKey="value" name="Portfolio" stroke="#00FFB2" fill="url(#portfolioGrad)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
