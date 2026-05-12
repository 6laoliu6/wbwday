import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from './storageKeys';
import { nowIso } from '@/utils/date';
import type {
  CreateGoalInput,
  Goal,
  GoalCheckIn,
  GoalCheckInInput,
  ISODateString,
  UpdateGoalInput,
} from '@/types';

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeGoal(goal: Goal): Goal {
  return {
    ...goal,
    title: goal.title ?? '',
    description: goal.description ?? '',
    dailyGoal: goal.dailyGoal ?? '',
    weeklyPlan: Array.isArray(goal.weeklyPlan) ? goal.weeklyPlan : [],
    status: goal.status ?? 'active',
    createdAt: goal.createdAt ?? nowIso(),
  };
}

function normalizeCheckIn(checkIn: GoalCheckIn): GoalCheckIn {
  return {
    ...checkIn,
    status: checkIn.status ?? 'completed',
    note: checkIn.note ?? '',
    createdAt: checkIn.createdAt ?? nowIso(),
  };
}

async function readGoals(): Promise<Goal[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.goals);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeGoal) : [];
  } catch {
    return [];
  }
}

async function writeGoals(goals: Goal[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
}

async function readCheckIns(): Promise<GoalCheckIn[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.goalCheckIns);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeCheckIn) : [];
  } catch {
    return [];
  }
}

async function writeCheckIns(checkIns: GoalCheckIn[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.goalCheckIns, JSON.stringify(checkIns));
}

function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort(
    (a, b) => a.targetDate.localeCompare(b.targetDate) || a.createdAt.localeCompare(b.createdAt),
  );
}

function sortCheckIns(checkIns: GoalCheckIn[]): GoalCheckIn[] {
  return [...checkIns].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getGoals(): Promise<Goal[]> {
  return sortGoals(await readGoals());
}

export async function getActiveGoals(): Promise<Goal[]> {
  const goals = await readGoals();
  return sortGoals(goals.filter((goal) => goal.status === 'active'));
}

export async function getGoalById(id: string): Promise<Goal | undefined> {
  const goals = await readGoals();
  return goals.find((goal) => goal.id === id);
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const goals = await readGoals();
  const timestamp = nowIso();
  const goal: Goal = {
    id: createId('goal'),
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    startDate: input.startDate,
    targetDate: input.targetDate,
    dailyGoal: input.dailyGoal?.trim() ?? '',
    weeklyPlan: input.weeklyPlan ?? [],
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await writeGoals([...goals, goal]);
  return goal;
}

export async function updateGoal(id: string, patch: UpdateGoalInput): Promise<Goal> {
  const goals = await readGoals();
  const target = goals.find((goal) => goal.id === id);

  if (!target) {
    throw new Error('Goal not found');
  }

  const updated: Goal = {
    ...target,
    ...patch,
    title: patch.title?.trim() ?? target.title,
    description: patch.description?.trim() ?? target.description,
    dailyGoal: patch.dailyGoal?.trim() ?? target.dailyGoal,
    weeklyPlan: patch.weeklyPlan ?? target.weeklyPlan ?? [],
    updatedAt: nowIso(),
  };

  await writeGoals(goals.map((goal) => (goal.id === id ? updated : goal)));
  return updated;
}

export async function archiveGoal(id: string): Promise<Goal> {
  return updateGoal(id, { status: 'archived' });
}

export async function deleteGoal(id: string): Promise<void> {
  const [goals, checkIns] = await Promise.all([readGoals(), readCheckIns()]);
  await Promise.all([
    writeGoals(goals.filter((goal) => goal.id !== id)),
    writeCheckIns(checkIns.filter((checkIn) => checkIn.goalId !== id)),
  ]);
}

export async function getCheckInsByGoalId(goalId: string): Promise<GoalCheckIn[]> {
  const checkIns = await readCheckIns();
  return sortCheckIns(checkIns.filter((checkIn) => checkIn.goalId === goalId));
}

export async function getCheckInByGoalIdAndDate(
  goalId: string,
  date: ISODateString,
): Promise<GoalCheckIn | undefined> {
  const checkIns = await readCheckIns();
  return checkIns.find((checkIn) => checkIn.goalId === goalId && checkIn.date === date);
}

export async function saveCheckIn(input: GoalCheckInInput): Promise<GoalCheckIn> {
  const checkIns = await readCheckIns();
  const existing = checkIns.find(
    (checkIn) => checkIn.goalId === input.goalId && checkIn.date === input.date,
  );
  const timestamp = nowIso();
  const nextCheckIn: GoalCheckIn = {
    id: existing?.id ?? input.id ?? createId('goal_check_in'),
    goalId: input.goalId,
    date: input.date,
    status: input.status,
    note: input.note?.trim() ?? '',
    createdAt: existing?.createdAt ?? input.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const nextCheckIns = existing
    ? checkIns.map((checkIn) => (checkIn.id === existing.id ? nextCheckIn : checkIn))
    : [...checkIns, nextCheckIn];

  await writeCheckIns(nextCheckIns);
  return nextCheckIn;
}

export async function updateCheckIn(
  goalId: string,
  date: ISODateString,
  patch: Partial<Pick<GoalCheckIn, 'status' | 'note'>>,
): Promise<GoalCheckIn> {
  const existing = await getCheckInByGoalIdAndDate(goalId, date);

  return saveCheckIn({
    id: existing?.id,
    goalId,
    date,
    status: patch.status ?? existing?.status ?? 'completed',
    note: patch.note ?? existing?.note ?? '',
    createdAt: existing?.createdAt,
  });
}

export async function deleteCheckIn(goalId: string, date: ISODateString): Promise<void> {
  const checkIns = await readCheckIns();
  await writeCheckIns(
    checkIns.filter((checkIn) => !(checkIn.goalId === goalId && checkIn.date === date)),
  );
}

