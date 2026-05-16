import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/storage/storageKeys';
import type { NewsArticle } from '@/types';

type GNewsArticle = {
  title?: string;
  url?: string;
  publishedAt?: string;
  source?: {
    name?: string;
  };
};

type GNewsResponse = {
  articles?: GNewsArticle[];
};

function createArticleId(article: GNewsArticle, index: number): string {
  return `${article.publishedAt ?? 'news'}_${article.url ?? article.title ?? index}`;
}

export function normalizeNewsResponse(data: unknown): NewsArticle[] {
  const response = data as GNewsResponse;
  if (!Array.isArray(response.articles)) return [];

  return response.articles
    .map((article, index) => ({
      id: createArticleId(article, index),
      title: article.title?.trim() ?? '',
      source: article.source?.name?.trim(),
      url: article.url,
      publishedAt: article.publishedAt,
      category: 'general',
    }))
    .filter((article) => article.title.length > 0)
    .slice(0, 3);
}

export async function getNewsApiKey(): Promise<string | undefined> {
  const apiKey = await AsyncStorage.getItem(STORAGE_KEYS.newsApiKey);
  return apiKey?.trim() || undefined;
}

export async function setNewsApiKey(apiKey: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.newsApiKey, apiKey.trim());
}

export async function clearNewsApiKey(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.newsApiKey);
}

export async function fetchTopNews(): Promise<NewsArticle[]> {
  const apiKey = await getNewsApiKey();
  if (!apiKey) throw new Error('NEWS_API_KEY_MISSING');

  const url = new URL('https://gnews.io/api/v4/top-headlines');
  url.searchParams.set('category', 'general');
  url.searchParams.set('lang', 'zh');
  url.searchParams.set('country', 'cn');
  url.searchParams.set('max', '3');
  url.searchParams.set('apikey', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`NEWS_REQUEST_FAILED_${response.status}`);
  }

  const articles = normalizeNewsResponse(await response.json());
  await saveCachedNews(articles);
  return articles;
}

export async function getCachedNews(): Promise<NewsArticle[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.newsArticles);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((article) => article?.title).slice(0, 3) : [];
  } catch {
    return [];
  }
}

export async function saveCachedNews(articles: NewsArticle[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.newsArticles, JSON.stringify(articles.slice(0, 3)));
}
