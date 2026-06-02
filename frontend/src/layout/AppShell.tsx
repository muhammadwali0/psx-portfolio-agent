import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HamburgerIcon from './HamburgerIcon';
import Drawer from './Drawer';
import { useStore } from '../store/store';
import { duration, easing } from '../design/animationTokens';

const SCREEN_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  portfolio: 'Portfolio',
  news: 'News',
  chat: 'AI Chat',
  settings: 'Settings',
};

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  const { drawerOpen, toggleDrawer, activeScreen, shariahMode } = useStore();

  return (
    <div className="min-h-screen min-h-[100dvh] bg-surface-primary text-psx-50 relative overflow-hidden">
      {/* Premium background layer */}
      <div className="main-bg-layer" />

      {/* Hamburger button outside header to be above Drawer (z-[55]) */}
      <div className="fixed top-0 left-2 z-[55] safe-top h-14 flex items-center justify-center">
        <HamburgerIcon isOpen={drawerOpen} onClick={toggleDrawer} />
      </div>

      {/* Top bar — premium glass */}
      <header className="fixed top-0 left-0 right-0 z-30 topbar-premium safe-top">
        <div className="flex items-center justify-between px-2 h-14">
          {/* Spacer to preserve alignment of header layout */}
          <div className="w-11 h-11" />
          
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.normal, ease: easing.easeOutExpo }}
            className="flex items-center gap-2"
          >
            <h1 className="text-[13px] font-heading font-bold tracking-tight">
              {SCREEN_TITLES[activeScreen]}
            </h1>
          </motion.div>

          {/* Right side — Shariah indicator or spacer */}
          <div className="w-11 h-11 flex items-center justify-center">
            {shariahMode && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-7 h-7 rounded-lg bg-shariah/10 border border-shariah/15 flex items-center justify-center"
              >
                <span className="text-[11px]">☪</span>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Drawer */}
      <Drawer />

      {/* Screen content */}
      <main className="pt-14 safe-top safe-bottom px-4 md:px-6 lg:px-8 max-w-5xl mx-auto w-full relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: duration.normal, ease: easing.easeOutExpo }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
