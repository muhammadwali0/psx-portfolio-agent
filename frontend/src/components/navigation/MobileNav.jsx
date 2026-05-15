import { NavLink } from 'react-router-dom';
import { HiOutlineViewGrid, HiOutlineBriefcase, HiOutlineLightningBolt, HiOutlineTrendingUp, HiOutlineGlobe } from 'react-icons/hi';

const mobileLinks = [
  { path: '/', icon: HiOutlineViewGrid, label: 'Home' },
  { path: '/portfolio', icon: HiOutlineBriefcase, label: 'Portfolio' },
  { path: '/ai-agent', icon: HiOutlineLightningBolt, label: 'AI' },
  { path: '/signals', icon: HiOutlineTrendingUp, label: 'Signals' },
  { path: '/market', icon: HiOutlineGlobe, label: 'Market' },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/90 backdrop-blur-xl border-t border-white/5 px-2 pb-safe">
      <div className="flex items-center justify-around h-16">
        {mobileLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-neon'
                  : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <link.icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,255,178,0.5)]' : ''}`} />
                <span className="text-[10px] font-medium">{link.label}</span>
                {isActive && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-neon rounded-full shadow-neon" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
