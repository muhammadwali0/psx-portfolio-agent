import { motion } from 'framer-motion';
import { HiArrowUp, HiArrowDown } from 'react-icons/hi';
import GlowCard from '@/components/common/GlowCard';
import { mockMarketSnapshot, mockIndices, mockTopMovers } from '@/data/mockMarket';

export default function MarketOverview({ snapshot }) {
  const data = snapshot || mockMarketSnapshot;
  const indices = mockIndices;
  const movers = mockTopMovers;

  return (
    <GlowCard className="!p-4 md:!p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Market Overview</h3>

      {/* Indices */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {indices.map((idx, i) => (
          <motion.div
            key={idx.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="text-center p-3 rounded-xl bg-dark-800/50 border border-white/5"
          >
            <p className="text-[10px] text-slate-500 font-medium">{idx.name}</p>
            <p className="text-lg font-bold font-number text-white mt-1">{idx.value.toLocaleString()}</p>
            <div className={`flex items-center justify-center gap-1 mt-1 text-xs font-semibold ${idx.changePct >= 0 ? 'text-neon' : 'text-danger'}`}>
              {idx.changePct >= 0 ? <HiArrowUp className="w-3 h-3" /> : <HiArrowDown className="w-3 h-3" />}
              {Math.abs(idx.changePct).toFixed(2)}%
            </div>
          </motion.div>
        ))}
      </div>

      {/* Market Breadth */}
      <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-dark-800/30">
        <div className="flex-1">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Advances: {data.advances}</span>
            <span>Declines: {data.declines}</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-dark-700">
            <div className="bg-neon/80 rounded-l-full" style={{ width: `${(data.advances / (data.advances + data.declines)) * 100}%` }} />
            <div className="bg-danger/80 rounded-r-full" style={{ width: `${(data.declines / (data.advances + data.declines)) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Top Movers */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-neon font-semibold mb-2 uppercase tracking-wider">🔼 Top Gainers</p>
          <div className="space-y-1.5">
            {movers.gainers.slice(0, 4).map((s) => (
              <div key={s.symbol} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <span className="font-semibold text-white">{s.symbol}</span>
                <span className="font-mono text-neon">+{s.change_pct.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-danger font-semibold mb-2 uppercase tracking-wider">🔽 Top Losers</p>
          <div className="space-y-1.5">
            {movers.losers.slice(0, 4).map((s) => (
              <div key={s.symbol} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <span className="font-semibold text-white">{s.symbol}</span>
                <span className="font-mono text-danger">{s.change_pct.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlowCard>
  );
}
