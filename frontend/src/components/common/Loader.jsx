import { motion } from 'framer-motion';

export default function Loader({ text = 'AI is thinking...', size = 'md' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="relative">
        {/* Outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className={`${size === 'lg' ? 'w-16 h-16' : 'w-10 h-10'} rounded-full border-2 border-transparent border-t-neon border-r-neon-blue`}
        />
        {/* Inner ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className={`absolute inset-1 rounded-full border-2 border-transparent border-b-neon-purple border-l-neon`}
        />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-neon shadow-neon"
          />
        </div>
      </div>
      {text && (
        <p className="text-sm text-slate-400 font-medium">{text}</p>
      )}
    </div>
  );
}
