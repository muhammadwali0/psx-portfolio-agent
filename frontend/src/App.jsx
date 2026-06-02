import { useEffect } from 'react';
import { useStore } from './store/store';
import AppShell from './layout/AppShell';
import SplashScreen from './screens/SplashScreen';
import DashboardScreen from './screens/DashboardScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import NewsScreen from './screens/NewsScreen';
import ChatScreen from './screens/ChatScreen';
import SettingsScreen from './screens/SettingsScreen';

function ScreenRouter() {
  const activeScreen = useStore((s) => s.activeScreen);

  switch (activeScreen) {
    case 'dashboard': return <DashboardScreen />;
    case 'portfolio': return <PortfolioScreen />;
    case 'news': return <NewsScreen />;
    case 'chat': return <ChatScreen />;
    case 'settings': return <SettingsScreen />;
    default: return <DashboardScreen />;
  }
}

export default function App() {
  const splashDone = useStore((s) => s.splashDone);
  const theme = useStore((s) => s.theme);
  const shariahMode = useStore((s) => s.shariahMode);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (shariahMode) {
      root.classList.add('shariah');
    } else {
      root.classList.remove('shariah');
    }
  }, [shariahMode]);

  return (
    <>
      <SplashScreen />
      {splashDone && (
        <AppShell>
          <ScreenRouter />
        </AppShell>
      )}
    </>
  );
}