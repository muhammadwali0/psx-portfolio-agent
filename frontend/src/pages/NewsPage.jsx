import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlowCard from '@/components/common/GlowCard';
import { getNews } from '@/services/api';
import { mockNews } from '@/data/mockNews';

const sourceColors = { dawn_business: 'bg-blue-500/10 text-blue-400 border-blue-500/20', ary_business: 'bg-red-500/10 text-red-400 border-red-500/20', geo_business: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
const sourceLabels = { dawn_business: 'Dawn', ary_business: 'ARY', geo_business: 'Geo' };

export default function NewsPage() {
  const [news, setNews] = useState(mockNews);
  useEffect(() => { getNews().then(r => setNews(r.data)); }, []);

  const timeAgo = (d) => { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 1 ? 'Just now' : h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`; };

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl md:text-2xl font-bold text-white">News</h1><p className="text-sm text-slate-500 mt-1">Latest financial news</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {news.map((a, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <GlowCard className="h-full">
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${sourceColors[a.source] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{sourceLabels[a.source] || a.source}</span>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{timeAgo(a.published_at)}</span>
              </div>
              <h3 className="text-sm font-semibold text-white leading-snug mb-2">{a.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{a.summary}</p>
              {a.tickers_mentioned?.length > 0 && (
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {a.tickers_mentioned.map(t => (<span key={t} className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-neon/10 text-neon border border-neon/20">{t}</span>))}
                </div>
              )}
            </GlowCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
