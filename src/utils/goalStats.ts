import type { Goal, GoalCheckIn, ISODateString } from '@/types';
import { toDateKey } from '@/utils/date';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseUtcDate(dateKey: ISODateString): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function diffDays(fromDate: ISODateString, toDate: ISODateString): number {
  return Math.round((parseUtcDate(toDate).getTime() - parseUtcDate(fromDate).getTime()) / MS_PER_DAY);
}

function addUtcDays(dateKey: ISODateString, days: number): ISODateString {
  const date = parseUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysUntilTarget(targetDate: ISODateString): number {
  return Math.max(0, diffDays(toDateKey(), targetDate));
}

export function getGoalTotalDays(startDate: ISODateString, targetDate: ISODateString): number {
  return Math.max(0, diffDays(startDate, targetDate) + 1);
}

export function getGoalElapsedDays(startDate: ISODateString, today: ISODateString): number {
  return Math.max(0, diffDays(startDate, today) + 1);
}

export function getGoalCompletedDays(checkIns: GoalCheckIn[]): number {
  return checkIns.reduce((sum, checkIn) => {
    if (checkIn.status === 'completed') {
      return sum + 1;
    }

    if (checkIn.status === 'partial') {
      return sum + 0.5;
    }

    return sum;
  }, 0);
}

export function getGoalCompletedCount(checkIns: GoalCheckIn[]): number {
  return checkIns.filter((checkIn) => checkIn.status === 'completed').length;
}

export function getGoalPartialCount(checkIns: GoalCheckIn[]): number {
  return checkIns.filter((checkIn) => checkIn.status === 'partial').length;
}

export function getGoalMissedCount(checkIns: GoalCheckIn[]): number {
  return checkIns.filter((checkIn) => checkIn.status === 'missed').length;
}

export function getGoalProgressPercent(goal: Goal, checkIns: GoalCheckIn[]): number {
  const totalDays = getGoalTotalDays(goal.startDate, goal.targetDate);

  if (totalDays === 0) {
    return 0;
  }

  return Math.min(100, Math.round((getGoalCompletedDays(checkIns) / totalDays) * 100));
}

export function getCheckInMap(checkIns: GoalCheckIn[]): Map<ISODateString, GoalCheckIn> {
  return new Map(checkIns.map((checkIn) => [checkIn.date, checkIn]));
}

export function getDateRange(startDate: ISODateString, targetDate: ISODateString): ISODateString[] {
  const totalDays = getGoalTotalDays(startDate, targetDate);
  return Array.from({ length: totalDays }, (_, index) => addUtcDays(startDate, index));
}
