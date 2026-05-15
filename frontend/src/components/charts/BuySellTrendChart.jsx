import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { mockChartData } from '@/data/mockCharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 border border-white/10 !rounded-lg">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value} signals
        </p>
      ))}
    </div>
  );
};

export default function BuySellTrendChart({ data }) {
  const chartData = data || mockChartData.buySellTrend;

  return (
    <div className="glass-card p-4 md:p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Buy/Sell Signal Trends</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="buy" name="Buy" fill="#00FFB2" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="sell" name="Sell" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
