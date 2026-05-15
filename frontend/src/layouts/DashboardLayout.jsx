import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/components/navigation/Sidebar';
import TopNav from '@/components/navigation/TopNav';
import MobileNav from '@/components/navigation/MobileNav';
import LiveTicker from '@/components/navigation/LiveTicker';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isMobile = !useMediaQuery('(min-width: 768px)');

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      {/* Sidebar — hidden on mobile */}
      {isDesktop && (
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Live Ticker Strip */}
        <LiveTicker />

        {/* Top Navigation */}
        <TopNav onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6 pb-20 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="max-w-[1600px] mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
}
