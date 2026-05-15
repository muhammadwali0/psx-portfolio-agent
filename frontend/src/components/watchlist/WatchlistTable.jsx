import { motion } from 'framer-motion';
import GlowCard from '@/components/common/GlowCard';
import Badge from '@/components/common/Badge';
import { mockMarketSnapshot } from '@/data/mockMarket';

export default function WatchlistTable({ data }) {
  const quotes = data || mockMarketSnapshot.quotes;

  return (
    <GlowCard className="!p-4 md:!p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Watchlist</h3>
        <button className="text-xs text-neon hover:underline">+ Add Stock</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-white/5">
              <th className="text-left pb-3 font-medium">Symbol</th>
              <th className="text-left pb-3 font-medium hidden sm:table-cell">Sector</th>
              <th className="text-right pb-3 font-medium">Price</th>
              <th className="text-right pb-3 font-medium">Change</th>
              <th className="text-right pb-3 font-medium hidden md:table-cell">Volume</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q, i) => (
              <motion.tr
                key={q.symbol}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <td className="py-3">
                  <span className="font-semibold text-white">{q.symbol}</span>
                  <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">{q.company_name}</p>
                </td>
                <td className="py-3 text-xs text-slate-400 hidden sm:table-cell">{q.sector}</td>
                <td className="py-3 text-right font-mono text-white text-xs">₨{q.current_price.toFixed(2)}</td>
                <td className="py-3 text-right">
                  <span className={`font-mono text-xs font-semibold ${q.change_pct >= 0 ? 'text-neon' : 'text-danger'}`}>
                    {q.change_pct >= 0 ? '+' : ''}{q.change_pct.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 text-right text-xs text-slate-400 font-mono hidden md:table-cell">
                  {(q.volume / 1000000).toFixed(1)}M
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlowCard>
  );
}
