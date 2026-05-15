import { useState } from 'react';
import SignalCard from './SignalCard';
import { mockSignals } from '@/data/mockSignals';

const filters = ['all', 'bullish', 'bearish', 'neutral'];

export default function SignalsList({ signals }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const data = signals || mockSignals;

  const filtered = activeFilter === 'all' ? data : data.filter(s => s.direction === activeFilter);

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
              activeFilter === f
                ? 'bg-neon/10 text-neon border border-neon/20'
                : 'text-slate-500 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {f} {f !== 'all' ? `(${data.filter(s => s.direction === f).length})` : `(${data.length})`}
          </button>
        ))}
      </div>

      {/* Signals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((signal, i) => (
          <SignalCard key={`${signal.ticker}-${signal.source}`} signal={signal} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 text-sm">No signals match this filter.</p>
        </div>
      )}
    </div>
  );
}
