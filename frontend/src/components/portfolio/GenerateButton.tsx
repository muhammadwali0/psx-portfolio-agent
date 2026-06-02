import { motion } from 'framer-motion';
import { Play, Loader2, Sparkles } from 'lucide-react';
import { useStore } from '../../store/store';

interface Props { onClick: () => void; loading: boolean; }

export default function GenerateButton({ onClick, loading }: Props) {
  const shariahMode = useStore((s) => s.shariahMode);
  
  return (
    <motion.button
      type="button"
      disabled={loading}
      whileTap={!loading ? { scale: 0.97 } : {}}
      whileHover={!loading ? { y: -1 } : {}}
      onClick={onClick}
      className={`
        relative w-full py-4 rounded-2xl font-heading font-bold text-[15px] transition-all duration-300 overflow-hidden
        ${loading
          ? 'bg-psx-500 cursor-not-allowed text-psx-300'
          : 'bg-gradient-to-r from-primary to-secondary text-selected shadow-lg shadow-primary/10 hover:brightness-105'
        }
      `}
    >
      {/* Shimmer overlay for premium button */}
      {!loading && (
        <div className="absolute inset-0 shimmer-gold-overlay pointer-events-none" />
      )}

      {loading ? (
        <span className="relative z-10 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Building Portfolio…
        </span>
      ) : (
        <span className="relative z-10 inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Generate Portfolio
        </span>
      )}
    </motion.button>
  );
}
