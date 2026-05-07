import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from './storageKeys';
import { nowIso } from '@/utils/date';
import type { DailyReview, ISODateString } from '@/types';

type ReviewPatch = Partial<Pick<DailyReview, 'rating' | 'summary' | 'unfinishedTaskIdsMovedToTomorrow'>>;

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeReview(review: DailyReview): DailyReview {
  return {
    ...review,
    id: review.id ?? createId('review'),
    summary: review.summary ?? '',
    unfinishedTaskIdsMovedToTomorrow: review.unfinishedTaskIdsMovedToTomorrow ?? [],
    createdAt: review.createdAt ?? nowIso(),
  };
}

async function readReviews(): Promise<DailyReview[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.dailyReviews);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeReview) : [];
  } catch {
    return [];
  }
}

async function writeReviews(reviews: DailyReview[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.dailyReviews, JSON.stringify(reviews));
}

export async function getReviewByDate(date: ISODateString): Promise<DailyReview | undefined> {
  const reviews = await readReviews();
  return reviews.find((review) => review.date === date);
}

export async function saveReview(review: DailyReview): Promise<DailyReview> {
  const reviews = await readReviews();
  const existingReview = reviews.find((item) => item.date === review.date);
  const timestamp = nowIso();
  const nextReview: DailyReview = {
    ...normalizeReview(review),
    id: existingReview?.id ?? review.id ?? createId('review'),
    createdAt: existingReview?.createdAt ?? review.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const nextReviews = existingReview
    ? reviews.map((item) => (item.date === nextReview.date ? nextReview : item))
    : [...reviews, nextReview];

  await writeReviews(nextReviews);
  return nextReview;
}

export async function updateReview(
  date: ISODateString,
  patch: ReviewPatch,
): Promise<DailyReview> {
  const existingReview = await getReviewByDate(date);
  const timestamp = nowIso();

  return saveReview({
    id: existingReview?.id ?? createId('review'),
    date,
    rating: patch.rating ?? existingReview?.rating,
    summary: patch.summary ?? existingReview?.summary ?? '',
    unfinishedTaskIdsMovedToTomorrow:
      patch.unfinishedTaskIdsMovedToTomorrow ??
      existingReview?.unfinishedTaskIdsMovedToTomorrow ??
      [],
    createdAt: existingReview?.createdAt ?? timestamp,
    updatedAt: timestamp,
  });
}

export async function getAllReviews(): Promise<DailyReview[]> {
  const reviews = await readReviews();
  return [...reviews].sort((a, b) => b.date.localeCompare(a.date));
}
