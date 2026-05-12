export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealMood = 'great' | 'good' | 'normal' | 'bad';

export type MealRecord = {
  id: string;
  date: string;
  mealType: MealType;
  title?: string;
  content: string;
  time?: string;
  mood?: MealMood;
  photoUri?: string;
  thumbnailUri?: string;
  source?: 'manual' | 'voice-text';
  rawText?: string;
  createdAt: string;
  updatedAt?: string;
};

export type MealRecordInput = Omit<MealRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type UpdateMealRecordInput = Partial<Omit<MealRecord, 'id' | 'createdAt'>>;
