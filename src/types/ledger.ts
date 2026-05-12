export type LedgerEntryType = 'expense' | 'income';

export type LedgerCategory =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'study'
  | 'health'
  | 'entertainment'
  | 'relationship'
  | 'housing'
  | 'daily'
  | 'salary'
  | 'partTime'
  | 'redPacket'
  | 'refund'
  | 'other';

export type LedgerEntry = {
  id: string;
  type: LedgerEntryType;
  amount: number;
  category: LedgerCategory;
  categoryLabel: string;
  date: string;
  note?: string;
  source?: 'manual' | 'voice-text' | 'import';
  rawText?: string;
  createdAt: string;
  updatedAt?: string;
};

export type CreateLedgerEntryInput = Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateLedgerEntryInput = Partial<Omit<LedgerEntry, 'id' | 'createdAt'>>;
