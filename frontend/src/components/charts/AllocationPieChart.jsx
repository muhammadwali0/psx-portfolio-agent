import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { mockSectorAllocation } from '@/data/mockPortfolio';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="glass-card p-3 border border-white/10 !rounded-lg">
      <p className="text-sm font-semibold text-white">{d.name}</p>
      <p className="text-xs font-mono mt-1" style={{ color: d.payload.color }}>{d.value}%</p>
    </div>
  );
};

export default function AllocationPieChart({ data }) {
  const chartData = data || mockSectorAllocation;

  return (
    <div className="glass-card p-4 md:p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Asset Allocation</h3>
      <div className="flex flex-col md:flex-row items-center gap-4">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              strokeWidth={2}
              stroke="#0B1120"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2 min-w-[140px]">
          {chartData.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-slate-400 flex-1">{item.name}</span>
              <span className="font-mono font-semibold text-white">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
