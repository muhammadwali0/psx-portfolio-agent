import { motion } from 'framer-motion';

interface Props {
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
  accentColor?: 'default' | 'shariah';
}

export default function SettingsToggle({ label, description, value, onToggle, accentColor = 'default' }: Props) {
  const activeColor = accentColor === 'shariah' ? 'bg-shariah' : 'bg-gold';
  
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between py-4 text-left">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-[13px] font-semibold text-psx-100">{label}</p>
        {description && <p className="text-[10px] text-psx-300 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${value ? activeColor : 'bg-psx-300 dark:bg-psx-500/20 border border-psx-400/20 dark:border-psx-500/10'}`}>
        <motion.div
          animate={{ x: value ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white dark:bg-psx-50 shadow-md border border-psx-200/10"
        />
      </div>
    </button>
  );
}
