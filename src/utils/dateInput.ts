import type { ISODateString } from '@/types';

export function toDateInputValue(dateKey?: string): string {
  return (dateKey ?? '').replace(/-/g, ' ').trim();
}

export function dateInputToDateKey(value: string): ISODateString | undefined {
  const parts = value
    .trim()
    .replace(/[./年月日-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length !== 3) return undefined;

  const [year, month, day] = parts;
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) {
    return undefined;
  }

  const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` as ISODateString;
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return undefined;
  }

  return dateKey;
}

export function isDateInputValue(value: string): boolean {
  return Boolean(dateInputToDateKey(value));
}
