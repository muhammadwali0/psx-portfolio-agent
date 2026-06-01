import { motion } from 'framer-motion';
import { Briefcase, Activity } from 'lucide-react';
import type { InvestmentMode } from '../../api/types';

interface Props { value: InvestmentMode; onChange: (v: InvestmentMode) => void; }

export default function ModeSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-psx-300 uppercase tracking-wider mb-2">
        Investment Mode
      </label>
      <div className="relative grid grid-cols-2 gap-2 p-1 rounded-xl bg-psx-800 border border-psx-500/10">
        {/* Sliding indicator */}
        <motion.div
          layoutId="mode-indicator"
          className="absolute top-1 bottom-1 rounded-lg bg-psx-600 border border-psx-500/20"
          style={{ width: 'calc(50% - 4px)', left: value === 'fundamental' ? '4px' : 'calc(50%)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        {[
          { v: 'fundamental' as const, icon: Briefcase, label: 'Fundamental', sub: 'Long-term value' },
          { v: 'tactical' as const, icon: Activity, label: 'Tactical', sub: 'Short-term momentum' },
        ].map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => onChange(opt.v)}
            className={`relative z-10 flex flex-col items-center gap-1 py-3 rounded-lg transition-colors ${value === opt.v ? 'text-psx-50' : 'text-psx-400'}`}
          >
            <opt.icon className="w-4 h-4" />
            <span className="text-[11px] font-semibold">{opt.label}</span>
            <span className="text-[9px] opacity-60">{opt.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
