import type { LedgerCategory, LedgerEntry } from '@/types';

export const ledgerCategoryLabels: Record<LedgerCategory, string> = {
  food: '餐饮',
  transport: '交通',
  shopping: '购物',
  study: '学习',
  health: '健康',
  entertainment: '娱乐',
  relationship: '人情',
  housing: '居住',
  daily: '日用',
  salary: '工资',
  partTime: '兼职',
  redPacket: '红包',
  refund: '退款',
  other: '其他',
};

export function getExpenseTotal(entries: LedgerEntry[]): number {
  return entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
}

export function getIncomeTotal(entries: LedgerEntry[]): number {
  return entries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
}

export function getBalance(entries: LedgerEntry[]): number {
  return getIncomeTotal(entries) - getExpenseTotal(entries);
}

export function groupLedgerEntriesByDate(entries: LedgerEntry[]): Record<string, LedgerEntry[]> {
  return entries.reduce<Record<string, LedgerEntry[]>>((groups, entry) => {
    groups[entry.date] = groups[entry.date] ?? [];
    groups[entry.date].push(entry);
    return groups;
  }, {});
}

export function groupLedgerEntriesByCategory(entries: LedgerEntry[]): Record<string, LedgerEntry[]> {
  return entries.reduce<Record<string, LedgerEntry[]>>((groups, entry) => {
    groups[entry.category] = groups[entry.category] ?? [];
    groups[entry.category].push(entry);
    return groups;
  }, {});
}

export function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function formatCurrency(amount: number): string {
  return `¥${Number(amount || 0).toFixed(2)}`;
}
