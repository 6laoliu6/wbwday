import type { ISODateString, ISODateTimeString } from './day';

export type GoalStatus = 'active' | 'completed' | 'archived';

export type GoalWeeklyPlanDay = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  weekdayLabel: string;
  title: string;
  content: string;
  taskTitle: string;
  taskCompletionStandard?: string;
};

export type Goal = {
  id: string;
  title: string;
  description?: string;
  startDate: ISODateString;
  targetDate: ISODateString;
  dailyGoal?: string;
  weeklyPlan?: GoalWeeklyPlanDay[];
  status: GoalStatus;
  createdAt: ISODateTimeString;
  updatedAt?: ISODateTimeString;
};

export type CreateGoalInput = {
  title: string;
  description?: string;
  startDate: ISODateString;
  targetDate: ISODateString;
  dailyGoal?: string;
  weeklyPlan?: GoalWeeklyPlanDay[];
};

export type UpdateGoalInput = Partial<
  Pick<Goal, 'title' | 'description' | 'startDate' | 'targetDate' | 'dailyGoal' | 'weeklyPlan' | 'status'>
>;

export type GoalCheckInStatus = 'completed' | 'partial' | 'missed';

export type GoalCheckIn = {
  id: string;
  goalId: string;
  date: ISODateString;
  status: GoalCheckInStatus;
  note?: string;
  createdAt: ISODateTimeString;
  updatedAt?: ISODateTimeString;
};

export type GoalCheckInInput = {
  id?: string;
  goalId: string;
  date: ISODateString;
  status: GoalCheckInStatus;
  note?: string;
  createdAt?: ISODateTimeString;
};
