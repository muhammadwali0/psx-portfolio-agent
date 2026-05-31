import { motion } from 'framer-motion';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { spring } from '../../design/animationTokens';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Something went wrong', onRetry }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.gentle}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-14 h-14 rounded-2xl bg-loss/10 flex items-center justify-center mb-5">
        <AlertCircle className="w-6 h-6 text-loss" />
      </div>
      <p className="text-sm text-psx-200 text-center mb-5 max-w-[260px] leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-psx-800 border border-psx-500/10 text-sm font-semibold text-psx-50 hover:bg-psx-600 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Try Again
        </motion.button>
      )}
    </motion.div>
  );
}
