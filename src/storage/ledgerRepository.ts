import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from './storageKeys';
import { nowIso, toDateKey } from '@/utils/date';
import { getExpenseTotal, getIncomeTotal, getMonthKey, ledgerCategoryLabels } from '@/utils/ledgerStats';
import type { CreateLedgerEntryInput, LedgerEntry, LedgerEntryType, UpdateLedgerEntryInput } from '@/types';

function createId(): string {
  return `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeEntry(entry: LedgerEntry): LedgerEntry {
  return {
    ...entry,
    type: entry.type ?? 'expense',
    amount: Math.max(0, Number(entry.amount) || 0),
    category: entry.category ?? 'other',
    categoryLabel: entry.categoryLabel ?? ledgerCategoryLabels[entry.category ?? 'other'],
    date: entry.date ?? toDateKey(),
    note: entry.note ?? '',
    createdAt: entry.createdAt ?? nowIso(),
  };
}

async function readEntries(): Promise<LedgerEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.ledgerEntries);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeEntry) : [];
  } catch {
    return [];
  }
}

async function writeEntries(entries: LedgerEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ledgerEntries, JSON.stringify(entries));
}

function sortEntries(entries: LedgerEntry[]): LedgerEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export async function getLedgerEntries(): Promise<LedgerEntry[]> {
  return sortEntries(await readEntries());
}

export async function getLedgerEntryById(id: string): Promise<LedgerEntry | undefined> {
  const entries = await readEntries();
  return entries.find((entry) => entry.id === id);
}

export async function getLedgerEntriesByDate(date: string): Promise<LedgerEntry[]> {
  const entries = await readEntries();
  return sortEntries(entries.filter((entry) => entry.date === date));
}

export async function getLedgerEntriesByMonth(yearMonth: string): Promise<LedgerEntry[]> {
  const entries = await readEntries();
  return sortEntries(entries.filter((entry) => getMonthKey(entry.date) === yearMonth));
}

export async function createLedgerEntry(input: CreateLedgerEntryInput): Promise<LedgerEntry> {
  const entries = await readEntries();
  const timestamp = nowIso();
  const entry: LedgerEntry = {
    id: createId(),
    type: input.type,
    amount: Math.max(0, Number(input.amount) || 0),
    category: input.category,
    categoryLabel: input.categoryLabel || ledgerCategoryLabels[input.category],
    date: input.date,
    note: input.note?.trim() ?? '',
    source: input.source ?? 'manual',
    rawText: input.rawText,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await writeEntries([...entries, entry]);
  return entry;
}

export async function updateLedgerEntry(id: string, patch: UpdateLedgerEntryInput): Promise<LedgerEntry> {
  const entries = await readEntries();
  const target = entries.find((entry) => entry.id === id);
  if (!target) throw new Error('Ledger entry not found');
  const category = patch.category ?? target.category;
  const updated: LedgerEntry = {
    ...target,
    ...patch,
    amount: patch.amount !== undefined ? Math.max(0, Number(patch.amount) || 0) : target.amount,
    category,
    categoryLabel: patch.categoryLabel ?? ledgerCategoryLabels[category],
    note: patch.note?.trim() ?? target.note,
    updatedAt: nowIso(),
  };
  await writeEntries(entries.map((entry) => (entry.id === id ? updated : entry)));
  return updated;
}

export async function deleteLedgerEntry(id: string): Promise<void> {
  const entries = await readEntries();
  await writeEntries(entries.filter((entry) => entry.id !== id));
}

export async function getTodayExpenseTotal(date = toDateKey()): Promise<number> {
  return getExpenseTotal(await getLedgerEntriesByDate(date));
}

export async function getMonthExpenseTotal(yearMonth: string): Promise<number> {
  return getExpenseTotal(await getLedgerEntriesByMonth(yearMonth));
}

export async function getMonthIncomeTotal(yearMonth: string): Promise<number> {
  return getIncomeTotal(await getLedgerEntriesByMonth(yearMonth));
}

export function isLedgerEntryType(value: string): value is LedgerEntryType {
  return value === 'expense' || value === 'income';
}
