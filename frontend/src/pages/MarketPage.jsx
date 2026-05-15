import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlowCard from '@/components/common/GlowCard';
import { getMarketSnapshot } from '@/services/api';
import { mockMarketSnapshot, mockIndices } from '@/data/mockMarket';
import { HiArrowUp, HiArrowDown } from 'react-icons/hi';

export default function MarketPage() {
  const [snapshot, setSnapshot] = useState(mockMarketSnapshot);

  useEffect(() => {
    getMarketSnapshot().then(r => setSnapshot(r.data));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Market</h1>
        <p className="text-sm text-slate-500 mt-1">Live PSX market data & indices</p>
      </div>

      {/* Index Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {mockIndices.map((idx, i) => (
          <GlowCard key={idx.name}>
            <p className="text-xs text-slate-500 font-medium">{idx.name}</p>
            <p className="text-2xl font-bold font-number text-white mt-1">{idx.value.toLocaleString()}</p>
            <div className={`flex items-center gap-1 mt-2 text-sm font-semibold ${idx.changePct >= 0 ? 'text-neon' : 'text-danger'}`}>
              {idx.changePct >= 0 ? <HiArrowUp /> : <HiArrowDown />}
              {idx.change.toFixed(2)} ({Math.abs(idx.changePct).toFixed(2)}%)
            </div>
          </GlowCard>
        ))}
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlowCard><p className="text-[10px] text-slate-500 uppercase">Volume</p><p className="text-lg font-bold font-number text-white">{(snapshot.total_volume / 1e6).toFixed(0)}M</p></GlowCard>
        <GlowCard><p className="text-[10px] text-slate-500 uppercase">Value</p><p className="text-lg font-bold font-number text-white">₨{snapshot.total_value_mn?.toFixed(0)}M</p></GlowCard>
        <GlowCard><p className="text-[10px] text-slate-500 uppercase">Advances</p><p className="text-lg font-bold font-number text-neon">{snapshot.advances}</p></GlowCard>
        <GlowCard><p className="text-[10px] text-slate-500 uppercase">Declines</p><p className="text-lg font-bold font-number text-danger">{snapshot.declines}</p></GlowCard>
      </div>

      {/* Stock Table */}
      <GlowCard className="!p-4 md:!p-5">
        <h3 className="text-sm font-semibold text-white mb-4">All Stocks</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                <th className="text-left pb-3 font-medium">Symbol</th>
                <th className="text-left pb-3 font-medium hidden md:table-cell">Company</th>
                <th className="text-left pb-3 font-medium hidden sm:table-cell">Sector</th>
                <th className="text-right pb-3 font-medium">Price</th>
                <th className="text-right pb-3 font-medium">Change</th>
                <th className="text-right pb-3 font-medium hidden md:table-cell">Volume</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.quotes?.map((q, i) => (
                <motion.tr key={q.symbol} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer">
                  <td className="py-3 font-semibold text-white">{q.symbol}</td>
                  <td className="py-3 text-xs text-slate-400 hidden md:table-cell">{q.company_name}</td>
                  <td className="py-3 text-xs text-slate-400 hidden sm:table-cell">{q.sector}</td>
                  <td className="py-3 text-right font-mono text-white text-xs">₨{q.current_price?.toFixed(2)}</td>
                  <td className="py-3 text-right"><span className={`font-mono text-xs font-semibold ${q.change_pct >= 0 ? 'text-neon' : 'text-danger'}`}>{q.change_pct >= 0 ? '+' : ''}{q.change_pct?.toFixed(2)}%</span></td>
                  <td className="py-3 text-right text-xs text-slate-400 font-mono hidden md:table-cell">{q.volume ? (q.volume / 1e6).toFixed(1) + 'M' : '—'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlowCard>
    </div>
  );
}
