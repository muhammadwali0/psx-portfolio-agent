export default function LiveDot({ color = 'neon', size = 'sm' }) {
  const colors = {
    neon: 'bg-neon shadow-[0_0_8px_rgba(0,255,178,0.6)]',
    red: 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    yellow: 'bg-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    blue: 'bg-neon-blue shadow-[0_0_8px_rgba(0,212,255,0.6)]',
  };

  const sizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  return (
    <span className="relative flex">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors[color]} ${sizes[size]}`} />
      <span className={`relative inline-flex rounded-full ${colors[color]} ${sizes[size]}`} />
    </span>
  );
}
