import { motion } from 'framer-motion';
import Badge from '@/components/common/Badge';
import GlowCard from '@/components/common/GlowCard';
import { mockPortfolio } from '@/data/mockPortfolio';

export default function HoldingsTable({ positions }) {
  const data = positions || mockPortfolio.positions;

  return (
    <GlowCard className="!p-4 md:!p-5 overflow-hidden">
      <h3 className="text-sm font-semibold text-white mb-4">Holdings</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-white/5">
              <th className="text-left pb-3 font-medium">Stock</th>
              <th className="text-left pb-3 font-medium hidden sm:table-cell">Sector</th>
              <th className="text-right pb-3 font-medium">Weight</th>
              <th className="text-right pb-3 font-medium">Price</th>
              <th className="text-right pb-3 font-medium">P&L</th>
              <th className="text-right pb-3 font-medium hidden md:table-cell">Risk</th>
            </tr>
          </thead>
          <tbody>
            {data.map((pos, i) => (
              <motion.tr
                key={pos.ticker}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group cursor-pointer"
              >
                <td className="py-3.5">
                  <div>
                    <span className="font-semibold text-white group-hover:text-neon transition-colors">{pos.ticker}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">{pos.companyName}</p>
                  </div>
                </td>
                <td className="py-3.5 text-slate-400 text-xs hidden sm:table-cell">{pos.sector}</td>
                <td className="py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5 bg-dark-700 rounded-full overflow-hidden hidden md:block">
                      <div className="h-full bg-neon/60 rounded-full" style={{ width: `${pos.allocationPct * 4}%` }} />
                    </div>
                    <span className="font-mono text-white text-xs">{pos.allocationPct}%</span>
                  </div>
                </td>
                <td className="py-3.5 text-right font-mono text-slate-300 text-xs">₨{pos.currentPrice?.toFixed(2)}</td>
                <td className="py-3.5 text-right">
                  <span className={`font-mono text-xs font-semibold ${pos.pnlPct >= 0 ? 'text-neon' : 'text-danger'}`}>
                    {pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct}%
                  </span>
                </td>
                <td className="py-3.5 text-right hidden md:table-cell">
                  <Badge type={pos.riskLevel}>{pos.riskLevel}</Badge>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlowCard>
  );
}
