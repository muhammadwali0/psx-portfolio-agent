import api from './api';
import type { NewsArticle } from './types';

const MOCK_NEWS: NewsArticle[] = [
  {
    title: 'KSE-100 index gains 450 points on strong corporate earnings',
    url: 'https://dps.psx.com.pk/',
    source: 'psx_market',
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    summary: 'The Pakistan Stock Exchange (PSX) benchmarks closed in green today, led by heavy buying in commercial banks, technology, and fertilizer sectors following stellar corporate results.',
    full_text: '',
    tickers_mentioned: ['SYS', 'MEBL', 'ENGRO'],
    scraped_at: new Date().toISOString(),
  },
  {
    title: 'Systems Limited reports record revenue growth in global markets',
    url: 'https://www.dawn.com/business',
    source: 'dawn_business',
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
    summary: 'Systems Limited (SYS) announced its financial results, showing substantial top-line expansion in European and Middle Eastern segments, prompting institutional analyst upgrades.',
    full_text: '',
    tickers_mentioned: ['SYS'],
    scraped_at: new Date().toISOString(),
  },
  {
    title: 'Meezan Bank Shariah-compliant funds cross PKR 300 billion milestone',
    url: 'https://www.dawn.com/business',
    source: 'geo_business',
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    summary: 'Meezan Bank (MEBL) continues to lead the Islamic banking space with its assets under management experiencing a double-digit YTD expansion due to growing demand for Shariah-compliant retail products.',
    full_text: '',
    tickers_mentioned: ['MEBL'],
    scraped_at: new Date().toISOString(),
  },
  {
    title: 'GoP lists new Government Ijarah Sukuk (GIS) on PSX for retail investors',
    url: 'https://dps.psx.com.pk/',
    source: 'psx_market',
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    summary: 'The government has listed its retail-focused asset-backed Ijarah Sukuk on the exchange, aiming to diversify funding sources and provide high-yield fixed income alternatives for the public.',
    full_text: '',
    tickers_mentioned: ['MEBL'],
    scraped_at: new Date().toISOString(),
  },
  {
    title: 'Engro Corporation targets fertilizer expansion plans amidst gas pricing adjustments',
    url: 'https://www.dawn.com/business',
    source: 'ary_business',
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    summary: 'Engro Corp (ENGRO) updates shareholders on efficiency improvements at its Daharki plant while navigating pricing revisions in gas supply chains to stabilize agricultural supplies.',
    full_text: '',
    tickers_mentioned: ['ENGRO'],
    scraped_at: new Date().toISOString(),
  }
];

export async function getNews(limit: number = 30): Promise<NewsArticle[]> {
  try {
    const res = await api.get<NewsArticle[]>('/news', { params: { limit } });
    if (res.data && res.data.length > 0) {
      return res.data;
    }
    console.warn('Real news API returned empty list, falling back to mock news.');
    return MOCK_NEWS.slice(0, limit);
  } catch (err) {
    console.warn('Real news API failed, falling back to mock news:', err);
    return MOCK_NEWS.slice(0, limit);
  }
}
