import api from './api';
import type { NewsArticle } from './types';

export async function getNews(limit: number = 30): Promise<NewsArticle[]> {
  const res = await api.get<NewsArticle[]>('/news', { params: { limit } });
  return res.data;
}
