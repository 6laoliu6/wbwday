import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedChip } from './ThemedChip';
import { completionStatusLabels, importanceLabels, statusLabels } from '@/constants/taskText';
import { radius, shadows, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { CompletionStatus, Task, TaskStatus } from '@/types';
import { formatFocusDuration, getTaskFocusSeconds } from '@/utils/time';

type TaskCardProps = {
  task: Task;
  index?: number;
  isDragging?: boolean;
  onDelete?: () => void;
  onLongPress?: () => void;
  onPress?: () => void;
  onStartFocus?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  onToggleTopThree?: () => void;
};

const completionTone: Record<CompletionStatus, 'success' | 'warning' | 'primary'> = {
  completed: 'success',
  partial: 'warning',
  exceeded: 'primary',
};

function formatIndex(index?: number): string {
  return String((index ?? 0) + 1).padStart(2, '0');
}

function getStatusTone(task: Task): 'default' | 'primary' | 'success' | 'warning' {
  if (task.completionStatus === 'exceeded') return 'primary';
  if (task.status === 'completed') return 'success';
  if (task.status === 'partial') return 'warning';
  if (task.status === 'in_progress') return 'primary';
  return 'default';
}

export function TaskCard({
  task,
  index,
  isDragging = false,
  onDelete,
  onLongPress,
  onPress,
  onStartFocus,
  onStatusChange,
  onToggleTopThree,
}: TaskCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isExceeded = task.completionStatus === 'exceeded';
  const isDone = task.status === 'completed' || isExceeded;
  const focusText = formatFocusDuration(getTaskFocusSeconds(task));
  const statusText =
    task.completionStatus && task.status !== 'not_started' && task.status !== 'in_progress'
      ? completionStatusLabels[task.completionStatus]
      : statusLabels[task.status];
  const proofUri = task.proofThumbnailUri ?? task.proofImageUri;
  const proofTone = task.completionStatus ? completionTone[task.completionStatus] : 'primary';

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        task.isTopThree ? styles.topThreeCard : undefined,
        isDone ? styles.doneCard : undefined,
        isDragging ? styles.draggingCard : undefined,
        pressed && onPress ? styles.pressed : undefined,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.sequenceWrap}>
          <Text style={[styles.sequence, isDone ? styles.sequenceDone : undefined]}>{formatIndex(index)}</Text>
          <View style={[styles.sequenceRail, isDone ? styles.sequenceRailDone : undefined]} />
        </View>

        <View style={styles.copyWrap}>
          <View style={styles.chipRow}>
            {task.isTopThree ? <ThemedChip label="今日大事" tone="accent" /> : null}
            <ThemedChip label={statusText} tone={getStatusTone(task)} />
            <ThemedChip label={`${importanceLabels[task.importance]}优先`} tone="default" />
          </View>
          <Text style={styles.title} numberOfLines={2}>{task.title}</Text>
          {task.completionCriteria ? <Text style={styles.criteria} numberOfLines={2}>{task.completionCriteria}</Text> : null}
        </View>

        {proofUri ? (
          <View style={styles.coverWrap}>
            <Image source={{ uri: proofUri }} style={styles.cover} />
            <View style={[styles.coverBadge, proofTone === 'warning' ? styles.coverBadgeWarning : proofTone === 'success' ? styles.coverBadgeSuccess : undefined]} />
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{'预计 '} {task.estimatedMinutes} min</Text>
        <Text style={styles.metaText}>{'专注 '} {focusText}</Text>
      </View>

      <View style={styles.primaryRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onStartFocus}
          style={({ pressed }) => [styles.focusButton, pressed ? styles.focusPressed : undefined]}
        >
          <Text style={styles.focusButtonText}>{'开始专注'}</Text>
          <View style={styles.focusDot} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.detailButton, pressed ? styles.detailPressed : undefined]}
        >
          <Text style={styles.detailText}>{'详情'}</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <ThemedChip active={task.status === 'completed'} label="完成" onPress={() => onStatusChange?.('completed')} tone="success" />
        <ThemedChip active={task.status === 'partial'} label="部分" onPress={() => onStatusChange?.('partial')} tone="warning" />
        <ThemedChip active={task.status === 'not_started'} label="未开始" onPress={() => onStatusChange?.('not_started')} tone="primary" />
        <ThemedChip label={task.isTopThree ? '取消大事' : '设为大事'} onPress={onToggleTopThree} tone="accent" />
        <ThemedChip label="删除" onPress={onDelete} tone="danger" />
      </View>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      minHeight: 216,
      borderColor: theme.border,
      borderRadius: radius.large,
      borderWidth: 1,
      backgroundColor: theme.surface,
      marginBottom: spacing.md,
      padding: spacing.lg,
      ...shadows.soft,
      shadowColor: theme.primary,
    },
    topThreeCard: {
      borderColor: theme.primary,
      backgroundColor: theme.surface,
    },
    doneCard: {
      backgroundColor: theme.surfaceAlt,
    },
    draggingCard: {
      ...shadows.floating,
      shadowColor: theme.primary,
      borderColor: theme.primary,
      transform: [{ scale: 1.018 }],
    },
    pressed: {
      opacity: 0.93,
      transform: [{ scale: 0.992 }],
    },
    topRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.md,
    },
    sequenceWrap: {
      width: 50,
      alignItems: 'flex-start',
    },
    sequence: {
      color: theme.primary,
      fontSize: 34,
      fontWeight: '900',
      lineHeight: 36,
    },
    sequenceDone: {
      color: theme.success,
    },
    sequenceRail: {
      width: 28,
      height: 5,
      borderRadius: radius.pill,
      backgroundColor: theme.accent,
      marginTop: spacing.xs,
    },
    sequenceRailDone: {
      backgroundColor: theme.success,
      opacity: 0.5,
    },
    copyWrap: {
      flex: 1,
      minWidth: 0,
    },
    chipRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.cardTitle,
      color: theme.text,
      fontWeight: '900',
    },
    criteria: {
      ...typography.body,
      color: theme.textMuted,
      lineHeight: 22,
      marginTop: spacing.xs,
    },
    coverWrap: {
      borderColor: theme.primary,
      borderRadius: radius.medium,
      borderWidth: 2,
      padding: 3,
    },
    cover: {
      width: 70,
      height: 88,
      borderRadius: radius.small,
      backgroundColor: theme.surfaceAlt,
    },
    coverBadge: {
      position: 'absolute',
      right: -4,
      top: -4,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.primary,
    },
    coverBadgeSuccess: {
      backgroundColor: theme.success,
    },
    coverBadgeWarning: {
      backgroundColor: theme.warning,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    metaText: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: '800',
    },
    primaryRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    focusButton: {
      minHeight: 48,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.primary,
      flexDirection: 'row',
      gap: spacing.xs,
    },
    focusPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.985 }],
    },
    focusButtonText: {
      ...typography.body,
      color: theme.textOnPrimary,
      fontWeight: '900',
    },
    focusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.accent,
    },
    detailButton: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      backgroundColor: theme.surfaceAlt,
      borderColor: theme.border,
      borderWidth: 1,
    },
    detailPressed: {
      opacity: 0.84,
    },
    detailText: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: '900',
    },
    actionRow: {
      borderTopColor: theme.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.md,
      paddingTop: spacing.md,
    },
  });
}
