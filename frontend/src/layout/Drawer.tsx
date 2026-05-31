import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, PieChart, Newspaper, MessageSquare, Settings } from 'lucide-react';
import { useStore, type ScreenName } from '../store/store';
import { spring } from '../design/animationTokens';

const NAV_ITEMS: { id: ScreenName; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'portfolio', label: 'Portfolio', icon: PieChart },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'chat', label: 'AI Chat', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Drawer() {
  const { drawerOpen, activeScreen, setScreen, closeDrawer, shariahMode } = useStore();

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer panel */}
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={spring.gentle}
            className="fixed top-0 left-0 bottom-0 w-[280px] z-50 flex flex-col safe-top"
            style={{
              background: 'linear-gradient(180deg, rgba(17,17,20,0.97) 0%, rgba(11,11,12,0.99) 100%)',
              backdropFilter: 'blur(32px) saturate(200%)',
              WebkitBackdropFilter: 'blur(32px) saturate(200%)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Header with premium branding */}
            <div className="pl-14 pr-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-heading font-bold text-sm relative overflow-hidden"
                  style={{
                    background: shariahMode
                      ? 'rgba(45, 159, 111, 0.12)'
                      : 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)',
                    border: `1px solid ${shariahMode ? 'rgba(45,159,111,0.15)' : 'rgba(34,197,94,0.15)'}`,
                    color: shariahMode ? '#4ADE80' : '#22C55E',
                  }}
                >
                  P
                </div>
                <div>
                  <h2 className="text-sm font-heading font-bold text-psx-50">PSX Agent</h2>
                  <p className="text-[10px] text-psx-300">AI Investment Intelligence</p>
                </div>
              </div>
            </div>

            <div className="h-px mx-6 border-b border-psx-500/10" />

            {/* Nav items */}
            <div className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item, i) => {
                const isActive = activeScreen === item.id;
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    onClick={() => setScreen(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                      ${isActive
                        ? shariahMode
                          ? 'bg-shariah/10 text-shariah-light border border-shariah/10'
                          : 'bg-gold/10 text-gold border border-gold/20'
                        : 'text-psx-200 hover:bg-psx-500/10 hover:text-psx-100 border border-transparent'
                      }
                    `}
                  >
                    <Icon className={`w-[18px] h-[18px] ${isActive ? (shariahMode ? 'text-shariah-light' : 'text-psx-50') : 'text-psx-300'}`} />
                    <span className="text-[13px] font-semibold">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ background: shariahMode ? '#4ADE80' : '#22C55E' }}
                        transition={spring.snappy}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-psx-500/10">
              {shariahMode && (
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-[10px]">☪</span>
                  <span className="text-[10px] font-medium text-shariah-light">Shariah Mode Active</span>
                </div>
              )}
              <p className="text-[10px] text-psx-400">
                PSX Portfolio Agent • v2.0
              </p>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
