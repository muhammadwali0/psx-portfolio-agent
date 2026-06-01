import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/store';
import { getMarketSnapshot, getAggregates } from '../api/market';
import { extractError } from '../api/api';
import TickerTape from '../components/dashboard/TickerTape';
import MarketIndexCards from '../components/dashboard/MarketIndexCards';
import MarketBreadth from '../components/dashboard/MarketBreadth';
import TopMovers from '../components/dashboard/TopMovers';
import MarketStats from '../components/dashboard/MarketStats';
import SkeletonShimmer from '../components/shared/SkeletonShimmer';
import ErrorState from '../components/shared/ErrorState';
import { stagger } from '../design/animationTokens';

export default function DashboardScreen() {
  const { snapshot, aggregates, marketLoading, marketError, setSnapshot, setAggregates, setMarketLoading, setMarketError } = useStore();

  const fetchData = useCallback(async () => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const [snap, agg] = await Promise.allSettled([getMarketSnapshot(), getAggregates()]);
      if (snap.status === 'fulfilled') setSnapshot(snap.value);
      if (agg.status === 'fulfilled') setAggregates(agg.value);
      if (snap.status === 'rejected' && agg.status === 'rejected') {
        setMarketError(extractError(snap.reason));
      }
    } catch (err) {
      setMarketError(extractError(err));
    } finally {
      setMarketLoading(false);
    }
  }, [setSnapshot, setAggregates, setMarketLoading, setMarketError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (marketLoading && !snapshot) {
    return (
      <div className="section-px py-6 space-y-4">
        <SkeletonShimmer variant="card" height="48px" className="w-full" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonShimmer variant="card" height="120px" />
          <SkeletonShimmer variant="card" height="120px" />
        </div>
        <SkeletonShimmer variant="card" height="200px" className="w-full" />
        <SkeletonShimmer variant="card" height="160px" className="w-full" />
      </div>
    );
  }

  if (marketError && !snapshot) {
    return <ErrorState message={marketError} onRetry={fetchData} />;
  }

  return (
    <div className="pb-8">
      {/* Ticker Tape */}
      {snapshot && snapshot.quotes.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: stagger.fast }}
        >
          <TickerTape quotes={snapshot.quotes} />
        </motion.div>
      )}

      <div className="section-px space-y-5 mt-4">
        {/* Market Indices */}
        {snapshot && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stagger.normal }}
          >
            <MarketIndexCards snapshot={snapshot} />
          </motion.div>
        )}

        {/* Market Breadth */}
        {snapshot && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stagger.normal * 2 }}
          >
            <MarketBreadth snapshot={snapshot} />
          </motion.div>
        )}

        {/* Top Movers */}
        {aggregates && aggregates.top_movers_by_change_pct.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stagger.normal * 3 }}
          >
            <TopMovers movers={aggregates.top_movers_by_change_pct} />
          </motion.div>
        )}

        {/* Market Stats */}
        {(snapshot || aggregates) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stagger.normal * 4 }}
          >
            <MarketStats snapshot={snapshot} aggregates={aggregates} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
