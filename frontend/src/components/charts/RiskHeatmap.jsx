import { motion } from 'framer-motion';
import { mockChartData } from '@/data/mockCharts';

function HeatCell({ value, max = 1 }) {
  const intensity = Math.min(value / max, 1);
  const hue = (1 - intensity) * 120; // 120=green, 0=red
  const color = `hsl(${hue}, 80%, 50%)`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.15 }}
      className="w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-mono font-bold cursor-pointer transition-all"
      style={{
        backgroundColor: `${color}20`,
        border: `1px solid ${color}40`,
        color: color,
      }}
      title={`Value: ${value.toFixed(2)}`}
    >
      {value.toFixed(2)}
    </motion.div>
  );
}

export default function RiskHeatmap({ data }) {
  const chartData = data || mockChartData.riskHeatmap;
  const metrics = ['volatility', 'beta', 'var', 'sharpe'];
  const metricLabels = { volatility: 'Vol', beta: 'Beta', var: 'VaR', sharpe: 'Sharpe' };

  return (
    <div className="glass-card p-4 md:p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Risk Heatmap</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-[10px] text-slate-500 font-medium pb-2 pr-3">Stock</th>
              {metrics.map(m => (
                <th key={m} className="text-center text-[10px] text-slate-500 font-medium pb-2 px-1">{metricLabels[m]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i}>
                <td className="text-xs font-semibold text-white py-1 pr-3">{row.ticker}</td>
                {metrics.map(m => (
                  <td key={m} className="p-1">
                    <HeatCell value={row[m]} max={m === 'sharpe' ? 3 : 1.5} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
