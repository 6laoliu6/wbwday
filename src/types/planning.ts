import type { TaskImportance } from './task';

export type TaskDraft = {
  id: string;
  title: string;
  completionStandard: string;
  importance: TaskImportance;
  estimatedMinutes: number;
  note: string;
};
