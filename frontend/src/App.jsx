import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardPage from '@/pages/DashboardPage';
import PortfolioPage from '@/pages/PortfolioPage';
import AIAgentPage from '@/pages/AIAgentPage';
import MarketPage from '@/pages/MarketPage';
import SignalsPage from '@/pages/SignalsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import WatchlistPage from '@/pages/WatchlistPage';
import NewsPage from '@/pages/NewsPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="ai-agent" element={<AIAgentPage />} />
          <Route path="market" element={<MarketPage />} />
          <Route path="signals" element={<SignalsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
