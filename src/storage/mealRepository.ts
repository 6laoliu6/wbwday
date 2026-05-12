import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from './storageKeys';
import { nowIso, toDateKey } from '@/utils/date';
import type { MealRecord, MealRecordInput, MealType, UpdateMealRecordInput } from '@/types';

function createId(): string {
  return `meal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRecord(record: MealRecord): MealRecord {
  return {
    ...record,
    date: record.date ?? toDateKey(),
    mealType: record.mealType ?? 'breakfast',
    title: record.title ?? '',
    content: record.content ?? '',
    time: record.time ?? '',
    createdAt: record.createdAt ?? nowIso(),
  };
}

async function readRecords(): Promise<MealRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.mealRecords);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeRecord) : [];
  } catch {
    return [];
  }
}

async function writeRecords(records: MealRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.mealRecords, JSON.stringify(records));
}

function sortRecords(records: MealRecord[]): MealRecord[] {
  return [...records].sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? ''));
}

export async function getMealRecords(): Promise<MealRecord[]> {
  return sortRecords(await readRecords());
}

export async function getMealRecordsByDate(date: string): Promise<MealRecord[]> {
  const records = await readRecords();
  return sortRecords(records.filter((record) => record.date === date));
}

export async function getMealRecordById(id: string): Promise<MealRecord | undefined> {
  const records = await readRecords();
  return records.find((record) => record.id === id);
}

export async function getMealRecordByDateAndType(date: string, mealType: MealType): Promise<MealRecord | undefined> {
  const records = await readRecords();
  return records.find((record) => record.date === date && record.mealType === mealType);
}

export async function saveMealRecord(input: MealRecordInput): Promise<MealRecord> {
  const records = await readRecords();
  const existing = records.find((record) => record.date === input.date && record.mealType === input.mealType);
  const timestamp = nowIso();
  const nextRecord: MealRecord = {
    id: existing?.id ?? input.id ?? createId(),
    date: input.date,
    mealType: input.mealType,
    title: input.title?.trim() ?? '',
    content: input.content.trim(),
    time: input.time ?? '',
    mood: input.mood,
    photoUri: input.photoUri,
    thumbnailUri: input.thumbnailUri,
    source: input.source ?? 'manual',
    rawText: input.rawText,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  const nextRecords = existing ? records.map((record) => (record.id === existing.id ? nextRecord : record)) : [...records, nextRecord];
  await writeRecords(nextRecords);
  return nextRecord;
}

export async function updateMealRecord(id: string, patch: UpdateMealRecordInput): Promise<MealRecord> {
  const records = await readRecords();
  const target = records.find((record) => record.id === id);
  if (!target) throw new Error('Meal record not found');
  const updated: MealRecord = { ...target, ...patch, content: patch.content?.trim() ?? target.content, updatedAt: nowIso() };
  await writeRecords(records.map((record) => (record.id === id ? updated : record)));
  return updated;
}

export async function deleteMealRecord(id: string): Promise<void> {
  const records = await readRecords();
  await writeRecords(records.filter((record) => record.id !== id));
}
