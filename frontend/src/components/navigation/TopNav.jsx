import { useState, useEffect } from 'react';
import { HiOutlineSearch, HiOutlineBell, HiOutlineMenu } from 'react-icons/hi';
import { checkHealth } from '@/services/api';
import LiveDot from '@/components/common/LiveDot';

export default function TopNav({ onMenuToggle }) {
  const [apiStatus, setApiStatus] = useState(null); // null = checking, true = online, false = offline
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { online } = await checkHealth();
      setApiStatus(online);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between h-14 px-4 md:px-6 bg-dark-900/60 backdrop-blur-xl border-b border-white/5 z-20">
      {/* Left Side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <HiOutlineMenu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="relative hidden md:block">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search stocks, signals..."
            className="w-64 lg:w-80 pl-10 pr-4 py-2 bg-dark-800/60 border border-white/5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neon/30 focus:shadow-neon/10 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 bg-dark-700/50 px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Mobile Search */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <HiOutlineSearch className="w-5 h-5" />
        </button>

        {/* AI Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/60 border border-white/5">
          <LiveDot color={apiStatus === true ? 'neon' : apiStatus === false ? 'red' : 'yellow'} />
          <span className="text-xs font-medium text-slate-400">
            {apiStatus === null ? 'Checking...' : apiStatus ? 'AI Online' : 'Demo Mode'}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          <HiOutlineBell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-neon rounded-full" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2 pl-3 border-l border-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon/20 to-neon-blue/20 border border-neon/30 flex items-center justify-center">
            <span className="text-xs font-bold text-neon">AI</span>
          </div>
        </div>
      </div>
    </header>
  );
}
