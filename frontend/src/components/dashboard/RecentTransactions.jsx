import { motion } from 'framer-motion';
import Badge from '@/components/common/Badge';
import GlowCard from '@/components/common/GlowCard';
import { mockTransactions } from '@/data/mockTransactions';

export default function RecentTransactions({ transactions }) {
  const data = transactions || mockTransactions;

  return (
    <GlowCard className="!p-4 md:!p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Recent Transactions</h3>
        <button className="text-xs text-neon hover:underline">View All</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-white/5">
              <th className="text-left pb-3 font-medium">Stock</th>
              <th className="text-left pb-3 font-medium">Type</th>
              <th className="text-right pb-3 font-medium">Shares</th>
              <th className="text-right pb-3 font-medium">Price</th>
              <th className="text-right pb-3 font-medium hidden sm:table-cell">Total</th>
              <th className="text-right pb-3 font-medium hidden md:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 6).map((tx, i) => (
              <motion.tr
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3 font-semibold text-white">{tx.ticker}</td>
                <td className="py-3"><Badge type={tx.type.toLowerCase()}>{tx.type}</Badge></td>
                <td className="py-3 text-right font-mono text-slate-300">{tx.shares}</td>
                <td className="py-3 text-right font-mono text-slate-300">₨{tx.price.toFixed(2)}</td>
                <td className="py-3 text-right font-mono text-white hidden sm:table-cell">₨{tx.total.toLocaleString()}</td>
                <td className="py-3 text-right text-slate-500 text-xs hidden md:table-cell">{tx.date}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlowCard>
  );
}
