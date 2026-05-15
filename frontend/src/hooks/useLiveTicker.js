import { useState, useEffect, useCallback } from 'react';
import { mockMarketSnapshot } from '@/data/mockMarket';

export function useLiveTicker() {
  const [tickerData, setTickerData] = useState([]);

  const generateTicker = useCallback(() => {
    const quotes = mockMarketSnapshot.quotes;
    return quotes.map(q => ({
      symbol: q.symbol,
      price: q.current_price + (Math.random() - 0.5) * 2,
      change: q.change + (Math.random() - 0.5) * 0.5,
      changePct: q.change_pct + (Math.random() - 0.5) * 0.3,
    }));
  }, []);

  useEffect(() => {
    setTickerData(generateTicker());
    const interval = setInterval(() => {
      setTickerData(generateTicker());
    }, 5000);
    return () => clearInterval(interval);
  }, [generateTicker]);

  return tickerData;
}
