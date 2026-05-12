import type { LedgerCategory, LedgerEntry, LedgerEntryType } from '@/types';
import { addDays, toDateKey } from '@/utils/date';
import { ledgerCategoryLabels } from '@/utils/ledgerStats';

function parseRelativeDate(rawText: string): string {
  const today = toDateKey();
  if (rawText.includes('前天')) return addDays(today, -2);
  if (rawText.includes('昨天')) return addDays(today, -1);
  return today;
}

function parseAmount(rawText: string): number | undefined {
  const match = rawText.match(/(?:¥\s*)?(\d+(?:\.\d+)?)\s*(?:块|元)?/);
  return match?.[1] ? Number(match[1]) : undefined;
}

function inferType(rawText: string): LedgerEntryType {
  if (/收入|收到|工资|兼职|红包|退款/.test(rawText)) return 'income';
  return 'expense';
}

function inferCategory(rawText: string, type: LedgerEntryType): LedgerCategory {
  if (/午饭|午餐|晚饭|晚餐|早餐|饭|奶茶|咖啡|吃/.test(rawText)) return 'food';
  if (/打车|地铁|公交|交通|车费/.test(rawText)) return 'transport';
  if (/书|课程|学习/.test(rawText)) return 'study';
  if (/药|医院|健康|运动/.test(rawText)) return 'health';
  if (/房租|水电|居住/.test(rawText)) return 'housing';
  if (/衣服|购物|买/.test(rawText)) return type === 'expense' ? 'shopping' : 'other';
  if (/工资/.test(rawText)) return 'salary';
  if (/兼职/.test(rawText)) return 'partTime';
  if (/红包/.test(rawText)) return 'redPacket';
  if (/退款/.test(rawText)) return 'refund';
  return type === 'expense' ? 'daily' : 'other';
}

function cleanNote(rawText: string): string {
  return rawText
    .replace(/今天|昨天|前天/g, '')
    .replace(/(?:¥\s*)?\d+(?:\.\d+)?\s*(?:块|元)?/g, '')
    .replace(/花了|支出|付了|付款|收入|收到/g, '')
    .trim();
}

export function parseLedgerText(rawText: string): Partial<LedgerEntry> | null {
  const text = rawText.trim();
  if (!text) return null;
  const amount = parseAmount(text);
  if (!amount || amount <= 0) return null;

  const type = inferType(text);
  const category = inferCategory(text, type);
  return {
    type,
    amount,
    category,
    categoryLabel: ledgerCategoryLabels[category],
    date: parseRelativeDate(text),
    note: cleanNote(text),
    source: 'voice-text',
    rawText: text,
  };
}
