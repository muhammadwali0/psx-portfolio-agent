import { motion } from 'framer-motion';

export default function GlowCard({ children, className = '', glowColor = 'neon', noBorder = false, ...props }) {
  const glowMap = {
    neon: 'hover:shadow-[0_0_30px_rgba(0,255,178,0.08)] hover:border-neon/20',
    blue: 'hover:shadow-[0_0_30px_rgba(0,212,255,0.08)] hover:border-neon-blue/20',
    purple: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.08)] hover:border-neon-purple/20',
    danger: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.08)] hover:border-red-500/20',
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        glass-card p-4 md:p-5
        ${!noBorder ? 'border border-white/[0.06]' : ''}
        ${glowMap[glowColor] || glowMap.neon}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
