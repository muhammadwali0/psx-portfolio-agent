import { motion } from 'framer-motion';
import { ShieldCheck, Shield, ShieldAlert } from 'lucide-react';
import type { RiskLevel } from '../../api/types';
import { useStore } from '../../store/store';

interface Props { value: RiskLevel; onChange: (v: RiskLevel) => void; }

const OPTIONS = [
  { value: 'low' as const, label: 'Conservative', shariahLabel: 'Stable', icon: ShieldCheck, color: 'text-profit', bgActive: 'bg-profit/10 border-profit/20', bg: 'bg-psx-800' },
  { value: 'medium' as const, label: 'Balanced', shariahLabel: 'Moderate', icon: Shield, color: 'text-amber-500 dark:text-yellow-400', bgActive: 'bg-amber-500/10 dark:bg-yellow-400/10 border-amber-500/20 dark:border-yellow-400/20', bg: 'bg-psx-800' },
  { value: 'high' as const, label: 'Aggressive', shariahLabel: 'Variable', icon: ShieldAlert, color: 'text-loss', bgActive: 'bg-loss/10 border-loss/20', bg: 'bg-psx-800' },
];

export default function RiskSelector({ value, onChange }: Props) {
  const shariahMode = useStore((s) => s.shariahMode);

  return (
    <div>
      <label className="block text-[10px] font-semibold text-psx-300 uppercase tracking-wider mb-2">
        Risk Preference
      </label>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const isActive = value === opt.value;
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.value}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => onChange(opt.value)}
              className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border transition-all duration-200 ${isActive ? `${opt.bgActive} shadow-sm border-current` : `${opt.bg} border-psx-500/30 dark:border-psx-500/10`}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? opt.color : 'text-psx-400'}`} />
              <span className={`text-[10px] font-semibold ${isActive ? opt.color : 'text-psx-300'}`}>
                {shariahMode ? opt.shariahLabel : opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
