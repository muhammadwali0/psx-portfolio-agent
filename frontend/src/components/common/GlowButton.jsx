import { motion } from 'framer-motion';

export default function GlowButton({ children, onClick, variant = 'primary', size = 'md', className = '', disabled = false, loading = false, ...props }) {
  const variants = {
    primary: 'bg-gradient-to-r from-neon/90 to-neon-blue/90 text-dark-950 font-bold hover:shadow-neon-lg',
    secondary: 'bg-dark-800 border border-white/10 text-white hover:border-neon/30 hover:shadow-neon/10',
    danger: 'bg-gradient-to-r from-red-500/90 to-red-600/90 text-white font-bold hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]',
    ghost: 'text-slate-400 hover:text-white hover:bg-white/5',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300
        ${variants[variant]} ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
}
