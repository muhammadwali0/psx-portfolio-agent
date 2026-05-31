import { ExternalLink, Clock } from 'lucide-react';
import GlassCard from '../shared/GlassCard';
import type { NewsArticle } from '../../api/types';

interface Props { article: NewsArticle; }

const SOURCE_LABELS: Record<string, string> = {
  dawn_business: 'Dawn',
  ary_business: 'ARY',
  geo_business: 'Geo',
  psx_market: 'PSX',
  gemini_reasoning: 'AI',
};

import { useStore } from '../../store/store';

export default function NewsCard({ article }: Props) {
  const timeAgo = article.published_at ? getTimeAgo(article.published_at) : '';
  const source = SOURCE_LABELS[article.source] || article.source;
  const shariahMode = useStore((s) => s.shariahMode);
  const isAI = article.source === 'gemini_reasoning';

  return (
    <GlassCard padding="md" variant="premium" hover>
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Source & time */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                isAI
                  ? shariahMode
                    ? 'bg-shariah/10 text-shariah-light border border-shariah/20'
                    : 'bg-gold/10 text-gold border border-gold/20'
                  : 'bg-surface-elevated text-psx-200 border border-psx-500/10'
              }`}>
                {source}
              </span>
              {timeAgo && (
                <span className="flex items-center gap-1 text-[9px] text-psx-300">
                  <Clock className="w-2.5 h-2.5" />{timeAgo}
                </span>
              )}
            </div>
            
            {/* Title */}
            <h3 className="text-[13px] font-semibold text-psx-50 leading-snug mb-2 line-clamp-2">
              {article.title}
            </h3>
            
            {/* Summary */}
            {article.summary && (
              <p className="text-[11px] text-psx-200 leading-relaxed line-clamp-2 mb-2">
                {article.summary}
              </p>
            )}

            {/* Tickers */}
            {article.tickers_mentioned.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {article.tickers_mentioned.slice(0, 5).map((t) => (
                  <span key={t} className="text-[9px] font-financial font-semibold px-1.5 py-0.5 rounded-md bg-surface-secondary border border-psx-500/10 text-psx-200">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-psx-300 shrink-0 mt-1" />
        </div>
      </a>
    </GlassCard>
  );
}

function getTimeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}
