import { motion } from 'framer-motion';
import { useStore } from '../store/store';

interface Props {
  isOpen: boolean;
  onClick: () => void;
}

export default function HamburgerIcon({ isOpen, onClick }: Props) {
  const line = `absolute left-1/2 h-[1.5px] rounded-full transition-all duration-300 bg-psx-50`;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-colors z-[55] hover:bg-psx-500/10`}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      <div className="relative w-5 h-4">
        {/* Top line */}
        <span
          className={`${line} w-5 -translate-x-1/2 ${isOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'}`}
        />
        {/* Middle line */}
        <span
          className={`${line} -translate-x-1/2 top-1/2 -translate-y-1/2 ${isOpen ? 'w-0 opacity-0' : 'w-3.5 opacity-100'}`}
        />
        {/* Bottom line */}
        <span
          className={`${line} w-5 -translate-x-1/2 ${isOpen ? 'bottom-1/2 translate-y-1/2 -rotate-45' : 'bottom-0'}`}
        />
      </div>
    </motion.button>
  );
}

