import type { ISODateString } from '@/types';

const weekdayLabels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const;

const pad2 = (value: number) => String(value).padStart(2, '0');

export function toDateKey(date = new Date()): ISODateString {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function fromDateKey(dateKey: ISODateString): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateKey: ISODateString, days: number): ISODateString {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function formatChineseDate(dateKey: ISODateString): string {
  const date = fromDateKey(dateKey);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdayLabels[date.getDay()]}`;
}

export function formatFullChineseDate(dateKey: ISODateString): string {
  const date = fromDateKey(dateKey);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdayLabels[date.getDay()]}`;
}

export function formatEditorialDate(dateKey: ISODateString): string {
  const date = fromDateKey(dateKey);
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} / ${weekdayLabels[date.getDay()]}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
