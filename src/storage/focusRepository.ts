import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from './storageKeys';
import { nowIso, toDateKey } from '@/utils/date';
import type { FocusMode, FocusSession, ISODateString } from '@/types';

type FocusSessionInput = {
  date?: ISODateString;
  mode: FocusMode;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  completed: boolean;
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeMode(mode: FocusMode | 'stopwatch'): FocusMode {
  return mode === 'stopwatch' ? 'normal' : mode;
}

function normalizeFocusSession(session: FocusSession & { mode: FocusMode | 'stopwatch' }): FocusSession {
  return {
    ...session,
    mode: normalizeMode(session.mode),
    durationSeconds: Math.max(0, Math.floor(session.durationSeconds ?? 0)),
    completed: session.completed ?? session.status === 'finished',
    createdAt: session.createdAt ?? session.startedAt ?? nowIso(),
  };
}

async function readFocusSessions(): Promise<FocusSession[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.focusSessions);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeFocusSession) : [];
  } catch {
    return [];
  }
}

async function writeFocusSessions(sessions: FocusSession[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.focusSessions, JSON.stringify(sessions));
}

function sortSessions(sessions: FocusSession[]): FocusSession[] {
  return [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function addFocusSession(
  taskId: string,
  input: FocusSessionInput,
): Promise<FocusSession> {
  const sessions = await readFocusSessions();
  const timestamp = nowIso();
  const durationSeconds = Math.max(0, Math.floor(input.durationSeconds));

  const session: FocusSession = {
    id: createId('focus'),
    taskId,
    date: input.date ?? toDateKey(),
    mode: input.mode,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationSeconds,
    completed: input.completed,
    status: input.completed ? 'finished' : 'cancelled',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await writeFocusSessions([...sessions, session]);
  return session;
}

export async function getFocusSessionsByTaskId(taskId: string): Promise<FocusSession[]> {
  const sessions = await readFocusSessions();
  return sortSessions(sessions.filter((session) => session.taskId === taskId));
}

export async function getFocusSessionsByDate(date: ISODateString): Promise<FocusSession[]> {
  const sessions = await readFocusSessions();
  return sortSessions(sessions.filter((session) => session.date === date));
}
