import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { spring } from '../../design/animationTokens';

interface Props {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ title = 'No data yet', message = 'Check back later', icon }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.gentle}
      className="flex flex-col items-center justify-center py-20 px-6"
    >
      <div className="w-14 h-14 rounded-2xl bg-psx-800 border border-psx-500/10 flex items-center justify-center mb-5">
        {icon || <Inbox className="w-6 h-6 text-psx-300" />}
      </div>
      <h3 className="text-sm font-semibold text-psx-200 mb-1">{title}</h3>
      <p className="text-xs text-psx-300 text-center max-w-[240px]">{message}</p>
    </motion.div>
  );
}
