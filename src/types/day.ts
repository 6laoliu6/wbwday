import type { CompletionProof } from './proof';
import type { Task } from './task';

export type ISODateString = string;
export type ISODateTimeString = string;

export interface DayRecord {
  date: ISODateString;
  taskIds: string[];
  orderedTaskIds: string[];
  completedTaskCount: number;
  totalFocusMinutes: number;
  proofs: CompletionProof[];
  tasks: Task[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface DailyReview {
  id: string;
  date: ISODateString;
  rating?: 1 | 2 | 3 | 4 | 5;
  summary?: string;
  unfinishedTaskIdsMovedToTomorrow: string[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
