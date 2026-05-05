import type { ISODateString, ISODateTimeString } from './day';

export type CompletionProofSource = 'camera' | 'library';
export type CompletionStatus = 'completed' | 'partial' | 'exceeded';

export interface CompletionProof {
  id: string;
  taskId: string;
  date: ISODateString;
  imageUri?: string;
  thumbnailUri?: string;
  note?: string;
  completionStatus: CompletionStatus;
  actualResult?: string;
  localUri?: string;
  source?: CompletionProofSource;
  reflection?: string;
  createdAt: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}
