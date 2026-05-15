import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';
import { sidebarLinks } from '@/config/navigation';

export default function Sidebar({ isOpen, onToggle }) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 240 : 72 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen bg-dark-900/80 backdrop-blur-xl border-r border-white/5 z-30"
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon to-neon-blue flex items-center justify-center flex-shrink-0">
            <span className="text-dark-950 font-black text-sm">P</span>
          </div>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="text-sm font-bold text-white tracking-tight">PSX AI Agent</h1>
              <p className="text-[10px] text-slate-500 -mt-0.5">Portfolio Intelligence</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {sidebarLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-neon/10 text-neon shadow-neon/5'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-neon/10 rounded-xl border border-neon/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <link.icon className={`w-5 h-5 flex-shrink-0 relative z-10 ${isActive ? 'text-neon' : ''}`} />
                {isOpen && (
                  <span className="relative z-10 truncate">{link.label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-10 border-t border-white/5 text-slate-500 hover:text-white transition-colors"
      >
        {isOpen ? <HiOutlineChevronLeft className="w-4 h-4" /> : <HiOutlineChevronRight className="w-4 h-4" />}
      </button>
    </motion.aside>
  );
}
