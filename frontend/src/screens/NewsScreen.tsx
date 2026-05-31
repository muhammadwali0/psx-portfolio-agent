import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/store';
import { getNews } from '../api/news';
import { extractError } from '../api/api';
import NewsCard from '../components/news/NewsCard';
import SectorFilterBar from '../components/news/SectorFilterBar';
import SkeletonShimmer from '../components/shared/SkeletonShimmer';
import ErrorState from '../components/shared/ErrorState';
import EmptyState from '../components/shared/EmptyState';
import { Newspaper } from 'lucide-react';
import { stagger } from '../design/animationTokens';

export default function NewsScreen() {
  const { articles, newsLoading, newsError, sectorFilter, setArticles, setNewsLoading, setNewsError, setSectorFilter } = useStore();

  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const data = await getNews(50);
      setArticles(data);
    } catch (err) {
      setNewsError(extractError(err));
    } finally {
      setNewsLoading(false);
    }
  }, [setArticles, setNewsLoading, setNewsError]);

  useEffect(() => { if (articles.length === 0) fetchNews(); }, []);

  const sectors = [...new Set(articles.flatMap((a) => a.tickers_mentioned).filter(Boolean))];

  const filtered = sectorFilter
    ? articles.filter((a) => a.tickers_mentioned.includes(sectorFilter))
    : articles;

  if (newsLoading && articles.length === 0) {
    return (
      <div className="section-px py-6 space-y-3">
        <SkeletonShimmer variant="line" width="120px" height="16px" />
        <SkeletonShimmer variant="card" height="140px" count={4} className="w-full mb-3" />
      </div>
    );
  }

  if (newsError && articles.length === 0) {
    return <ErrorState message={newsError} onRetry={fetchNews} />;
  }

  if (articles.length === 0) {
    return <EmptyState title="No news available" message="Financial news will appear here when the market data is loaded" icon={<Newspaper className="w-6 h-6 text-psx-300" />} />;
  }

  return (
    <div className="pb-8">
      {sectors.length > 0 && (
        <SectorFilterBar
          tickers={sectors.slice(0, 15)}
          selected={sectorFilter}
          onSelect={setSectorFilter}
        />
      )}

      <div className="section-px space-y-3 mt-4">
        {filtered.map((article, i) => (
          <motion.div
            key={article.url}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stagger.list * Math.min(i, 10) }}
          >
            <NewsCard article={article} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
