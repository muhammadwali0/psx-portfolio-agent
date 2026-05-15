export default function Badge({ type = 'buy', children, className = '' }) {
  const styles = {
    buy: 'bg-neon/10 text-neon border-neon/20',
    sell: 'bg-red-500/10 text-red-400 border-red-500/20',
    hold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    bullish: 'bg-neon/10 text-neon border-neon/20',
    bearish: 'bg-red-500/10 text-red-400 border-red-500/20',
    neutral: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    active: 'bg-neon/10 text-neon border-neon/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    executed: 'bg-neon/10 text-neon border-neon/20',
    low: 'bg-neon/10 text-neon border-neon/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-md ${styles[type] || styles.neutral} ${className}`}>
      {children || type}
    </span>
  );
}
