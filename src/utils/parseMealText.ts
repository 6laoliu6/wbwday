import type { MealRecord, MealType } from '@/types';
import { addDays, toDateKey } from '@/utils/date';

function parseDate(rawText: string): string {
  const today = toDateKey();
  if (rawText.includes('前天')) return addDays(today, -2);
  if (rawText.includes('昨天')) return addDays(today, -1);
  return today;
}

function parseMealType(rawText: string): MealType | undefined {
  if (/早餐|早饭|早上/.test(rawText)) return 'breakfast';
  if (/午餐|午饭|中午/.test(rawText)) return 'lunch';
  if (/晚餐|晚饭|晚上|晚/.test(rawText)) return 'dinner';
  if (/加餐|零食|下午茶|夜宵/.test(rawText)) return 'snack';
  return undefined;
}

function cleanContent(rawText: string): string {
  return rawText
    .replace(/今天|昨天|前天/g, '')
    .replace(/早餐|早饭|早上|午餐|午饭|中午|晚餐|晚饭|晚上|加餐|吃了|吃/g, '')
    .trim();
}

export function parseMealText(rawText: string): Partial<MealRecord> | null {
  const text = rawText.trim();
  if (!text) return null;
  const mealType = parseMealType(text);
  if (!mealType) return null;
  const content = cleanContent(text);
  if (!content) return null;
  return { date: parseDate(text), mealType, content, source: 'voice-text', rawText: text };
}
