import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { mockChartData } from '@/data/mockCharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 border border-white/10 !rounded-lg">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {p.value?.toLocaleString() ?? '—'}
        </p>
      ))}
    </div>
  );
};

export default function PredictionChart({ data }) {
  const chartData = data || mockChartData.aiPrediction;

  return (
    <div className="glass-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">AI KSE-100 Prediction</h3>
          <p className="text-xs text-slate-500 mt-0.5">6-week forecast with confidence bands</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neon-purple/10 text-neon-purple text-[10px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
          AI Powered
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A855F7" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="upper" name="Upper Band" stroke="none" fill="url(#confidenceBand)" />
          <Area type="monotone" dataKey="lower" name="Lower Band" stroke="none" fill="transparent" />
          <Line type="monotone" dataKey="actual" name="Actual" stroke="#00FFB2" strokeWidth={2.5} dot={{ r: 3, fill: '#00FFB2' }} connectNulls={false} />
          <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#A855F7" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: '#A855F7' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
