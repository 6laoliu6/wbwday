import type { ISODateString, ISODateTimeString } from './day';

export type FocusMode = 'normal' | 'pomodoro';
export type FocusSessionStatus = 'running' | 'paused' | 'finished' | 'cancelled';

export interface FocusSession {
  id: string;
  taskId: string;
  date: ISODateString;
  mode: FocusMode;
  startedAt: ISODateTimeString;
  endedAt?: ISODateTimeString;
  durationSeconds: number;
  completed: boolean;
  status?: FocusSessionStatus;
  pausedAt?: ISODateTimeString;
  createdAt: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}
