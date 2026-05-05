import type { ISODateString, ISODateTimeString } from './day';
import type { CompletionStatus } from './proof';

export type TaskImportance = 'high' | 'medium' | 'low';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'partial';

export interface Task {
  id: string;
  date: ISODateString;
  title: string;
  completionCriteria: string;
  importance: TaskImportance;
  estimatedMinutes: number;
  status: TaskStatus;
  focusSeconds?: number;
  focusMinutes: number;
  note: string;
  isTopThree: boolean;
  order: number;
  sortOrder?: number;
  completionProofId?: string;
  completionProofIds: string[];
  proofThumbnailUri?: string;
  proofImageUri?: string;
  completionStatus?: CompletionStatus;
  actualResult?: string;
  completionReflection?: string;
  completedAt?: ISODateTimeString;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export type CreateTaskInput = {
  date?: ISODateString;
  title: string;
  completionCriteria: string;
  importance: TaskImportance;
  estimatedMinutes: number;
  note?: string;
  isTopThree?: boolean;
};

export type UpdateTaskInput = Partial<
  Pick<
    Task,
    | 'title'
    | 'completionCriteria'
    | 'importance'
    | 'estimatedMinutes'
    | 'status'
    | 'focusSeconds'
    | 'focusMinutes'
    | 'note'
    | 'isTopThree'
    | 'order'
    | 'sortOrder'
    | 'completionProofId'
    | 'completionProofIds'
    | 'proofThumbnailUri'
    | 'proofImageUri'
    | 'completionStatus'
    | 'actualResult'
    | 'completionReflection'
    | 'completedAt'
  >
>;
