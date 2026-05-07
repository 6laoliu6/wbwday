import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from './storageKeys';
import { addDays, nowIso, toDateKey } from '@/utils/date';
import { getTaskFocusSeconds, secondsToMinutes } from '@/utils/time';
import type { CreateTaskInput, ISODateString, Task, UpdateTaskInput } from '@/types';

export const MAX_TOP_THREE_TASKS = 3;

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => getTaskOrder(a) - getTaskOrder(b) || a.createdAt.localeCompare(b.createdAt),
  );
}

function getTaskOrder(task: Task): number {
  if (typeof task.sortOrder === 'number') {
    return task.sortOrder;
  }

  if (typeof task.order === 'number') {
    return task.order;
  }

  return 0;
}

function normalizeTask(task: Task): Task {
  const order = getTaskOrder(task);

  return {
    ...task,
    focusSeconds: getTaskFocusSeconds(task),
    focusMinutes: secondsToMinutes(getTaskFocusSeconds(task)),
    note: task.note ?? '',
    isTopThree: task.isTopThree ?? false,
    order,
    sortOrder: order,
    completionProofIds: task.completionProofIds ?? [],
    status: task.status ?? 'not_started',
  };
}

function assertTopThreeLimit(tasks: Task[], date: ISODateString, taskId?: string): void {
  const topThreeCount = tasks.filter(
    (task) => task.date === date && task.id !== taskId && task.isTopThree,
  ).length;

  if (topThreeCount >= MAX_TOP_THREE_TASKS) {
    throw new Error('TOP_THREE_LIMIT_REACHED');
  }
}

function normalizeOrders(tasks: Task[], date: ISODateString): Task[] {
  let order = 0;
  const sortedForDate = sortTasks(tasks.filter((task) => task.date === date));
  const nextOrderById = new Map(sortedForDate.map((task) => [task.id, order++]));

  return tasks.map((task) => {
    const nextOrder = nextOrderById.get(task.id);
    return typeof nextOrder === 'number'
      ? { ...task, order: nextOrder, sortOrder: nextOrder, updatedAt: nowIso() }
      : task;
  });
}

async function readTasks(): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.tasks);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeTask) : [];
  } catch {
    return [];
  }
}

async function writeTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
}

export async function getAllTasks(): Promise<Task[]> {
  return sortTasks(await readTasks());
}

export async function getTasksByDate(date: ISODateString): Promise<Task[]> {
  const tasks = await readTasks();
  return sortTasks(tasks.filter((task) => task.date === date));
}

export async function getTodayTasks(): Promise<Task[]> {
  return getTasksByDate(toDateKey());
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const tasks = await readTasks();
  const date = input.date ?? toDateKey();
  const existingForDate = tasks.filter((task) => task.date === date);
  const timestamp = nowIso();

  const task: Task = {
    id: createId('task'),
    date,
    title: input.title.trim(),
    completionCriteria: input.completionCriteria.trim(),
    importance: input.importance,
    estimatedMinutes: input.estimatedMinutes,
    status: 'not_started',
    focusSeconds: 0,
    focusMinutes: 0,
    note: input.note?.trim() ?? '',
    isTopThree: input.isTopThree ?? false,
    order: existingForDate.length,
    sortOrder: existingForDate.length,
    completionProofIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (task.isTopThree) {
    assertTopThreeLimit(tasks, date);
  }

  await writeTasks([...tasks, task]);
  return task;
}

export async function createTasks(inputs: CreateTaskInput[]): Promise<Task[]> {
  const validInputs = inputs.filter(
    (input) => input.title.trim().length > 0 && input.completionCriteria.trim().length > 0,
  );

  if (validInputs.length === 0) {
    return [];
  }

  const tasks = await readTasks();
  const timestamp = nowIso();
  const orderCountByDate = new Map<ISODateString, number>();
  const nextTasks: Task[] = [];

  for (const task of tasks) {
    const currentCount = orderCountByDate.get(task.date) ?? 0;
    orderCountByDate.set(task.date, Math.max(currentCount, getTaskOrder(task) + 1));
  }

  for (const input of validInputs) {
    const date = input.date ?? toDateKey();

    if (input.isTopThree) {
      assertTopThreeLimit([...tasks, ...nextTasks], date);
    }

    const order = orderCountByDate.get(date) ?? 0;
    orderCountByDate.set(date, order + 1);

    nextTasks.push({
      id: createId('task'),
      date,
      title: input.title.trim(),
      completionCriteria: input.completionCriteria.trim(),
      importance: input.importance,
      estimatedMinutes: input.estimatedMinutes,
      status: 'not_started',
      focusSeconds: 0,
      focusMinutes: 0,
      note: input.note?.trim() ?? '',
      isTopThree: input.isTopThree ?? false,
      order,
      sortOrder: order,
      completionProofIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  await writeTasks([...tasks, ...nextTasks]);
  return nextTasks;
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  const tasks = await readTasks();
  return tasks.find((task) => task.id === id);
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const tasks = await readTasks();
  const target = tasks.find((task) => task.id === id);

  if (!target) {
    throw new Error('Task not found');
  }

  if (input.isTopThree === true && !target.isTopThree) {
    assertTopThreeLimit(tasks, target.date, id);
  }

  const nextOrder = input.sortOrder ?? input.order ?? getTaskOrder(target);
  const nextFocusSeconds =
    typeof input.focusSeconds === 'number'
      ? Math.max(0, Math.floor(input.focusSeconds))
      : typeof input.focusMinutes === 'number'
        ? Math.max(0, Math.floor(input.focusMinutes * 60))
        : getTaskFocusSeconds(target);

  const updated: Task = {
    ...target,
    ...input,
    title: input.title?.trim() ?? target.title,
    completionCriteria: input.completionCriteria?.trim() ?? target.completionCriteria,
    note: input.note?.trim() ?? target.note,
    focusSeconds: nextFocusSeconds,
    focusMinutes: secondsToMinutes(nextFocusSeconds),
    order: nextOrder,
    sortOrder: nextOrder,
    updatedAt: nowIso(),
  };

  await writeTasks(tasks.map((task) => (task.id === id ? updated : task)));
  return updated;
}

export async function addFocusSecondsToTask(taskId: string, seconds: number): Promise<Task> {
  const tasks = await readTasks();
  const target = tasks.find((task) => task.id === taskId);

  if (!target) {
    throw new Error('Task not found');
  }

  const durationSeconds = Math.max(0, Math.floor(seconds));
  const nextFocusSeconds = getTaskFocusSeconds(target) + durationSeconds;
  const updated: Task = {
    ...target,
    focusSeconds: nextFocusSeconds,
    focusMinutes: secondsToMinutes(nextFocusSeconds),
    status: target.status === 'not_started' ? 'in_progress' : target.status,
    updatedAt: nowIso(),
  };

  await writeTasks(tasks.map((task) => (task.id === taskId ? updated : task)));
  return updated;
}

export async function duplicateTaskToDate(taskId: string, date: ISODateString): Promise<Task> {
  const sourceTask = await getTaskById(taskId);

  if (!sourceTask) {
    throw new Error('Task not found');
  }

  return createTask({
    date,
    title: sourceTask.title,
    completionCriteria: sourceTask.completionCriteria,
    importance: sourceTask.importance,
    estimatedMinutes: sourceTask.estimatedMinutes,
    note: sourceTask.note,
    isTopThree: false,
  });
}

export async function moveTaskToTomorrow(taskId: string): Promise<Task> {
  const sourceTask = await getTaskById(taskId);

  if (!sourceTask) {
    throw new Error('Task not found');
  }

  return duplicateTaskToDate(taskId, addDays(sourceTask.date, 1));
}

export async function deleteTask(id: string): Promise<void> {
  const tasks = await readTasks();
  const taskToDelete = tasks.find((task) => task.id === id);

  if (!taskToDelete) {
    return;
  }

  const remainingTasks = tasks.filter((task) => task.id !== id);
  await writeTasks(normalizeOrders(remainingTasks, taskToDelete.date));
}

export async function saveTaskOrder(
  date: ISODateString,
  orderedTaskIds: string[],
): Promise<Task[]> {
  const tasks = await readTasks();
  const orderById = new Map(orderedTaskIds.map((id, index) => [id, index]));
  const tasksForDate = sortTasks(tasks.filter((task) => task.date === date));
  const orderedIdSet = new Set(orderedTaskIds);
  const missingOrderById = new Map(
    tasksForDate
      .filter((task) => !orderedIdSet.has(task.id))
      .map((task, index) => [task.id, orderedTaskIds.length + index]),
  );

  const updatedTasks = tasks.map((task) => {
    if (task.date !== date) {
      return task;
    }

    const explicitOrder = orderById.get(task.id);
    const order = explicitOrder ?? missingOrderById.get(task.id) ?? task.order;

    return {
      ...task,
      order,
      sortOrder: order,
      updatedAt: nowIso(),
    };
  });

  await writeTasks(updatedTasks);
  return getTasksByDate(date);
}

export async function getTaskDates(): Promise<ISODateString[]> {
  const tasks = await readTasks();
  return Array.from(new Set(tasks.map((task) => task.date))).sort((a, b) => b.localeCompare(a));
}
