import type { MealMood, MealRecord, MealType } from '@/types';

export function getMealTypeLabel(mealType: MealType): string {
  const labels: Record<MealType, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
  return labels[mealType];
}

export function getMealMoodLabel(mood?: MealMood): string {
  if (!mood) return '未选择';
  const labels: Record<MealMood, string> = { great: '很好', good: '不错', normal: '一般', bad: '不太好' };
  return labels[mood];
}

export function getMealsCompletedCount(records: MealRecord[]): number {
  const coreTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];
  return coreTypes.filter((mealType) => records.some((record) => record.mealType === mealType && record.content.trim().length > 0)).length;
}

export function getMealCompletionPercent(records: MealRecord[]): number {
  return Math.round((getMealsCompletedCount(records) / 3) * 100);
}

export function getMealSummaryByDate(records: MealRecord[]): Record<MealType, MealRecord | undefined> {
  return {
    breakfast: records.find((record) => record.mealType === 'breakfast'),
    lunch: records.find((record) => record.mealType === 'lunch'),
    dinner: records.find((record) => record.mealType === 'dinner'),
    snack: records.find((record) => record.mealType === 'snack'),
  };
}
