import { 
  HiOutlineViewGrid, 
  HiOutlineBriefcase, 
  HiOutlineLightningBolt,
  HiOutlineGlobe,
  HiOutlineChartBar, 
  HiOutlineStar,
  HiOutlineNewspaper,
  HiOutlineCog,
  HiOutlineTrendingUp,
} from 'react-icons/hi';

export const sidebarLinks = [
  { path: '/', label: 'Dashboard', icon: HiOutlineViewGrid },
  { path: '/portfolio', label: 'Portfolio', icon: HiOutlineBriefcase },
  { path: '/ai-agent', label: 'AI Agent', icon: HiOutlineLightningBolt },
  { path: '/market', label: 'Market', icon: HiOutlineGlobe },
  { path: '/signals', label: 'Signals', icon: HiOutlineTrendingUp },
  { path: '/analytics', label: 'Analytics', icon: HiOutlineChartBar },
  { path: '/watchlist', label: 'Watchlist', icon: HiOutlineStar },
  { path: '/news', label: 'News', icon: HiOutlineNewspaper },
  { path: '/settings', label: 'Settings', icon: HiOutlineCog },
];
