import type { CompletionStatus, TaskImportance, TaskStatus } from '@/types';

export const importanceLabels: Record<TaskImportance, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const importanceNames: Record<TaskImportance, string> = {
  high: '高重要',
  medium: '中重要',
  low: '低重要',
};

export const statusLabels: Record<TaskStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  partial: '部分完成',
};

export const completionStatusLabels: Record<CompletionStatus, string> = {
  completed: '已完成',
  partial: '部分完成',
  exceeded: '超额完成',
};
