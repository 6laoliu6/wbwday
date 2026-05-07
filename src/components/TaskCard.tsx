import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { completionStatusLabels, importanceLabels, statusLabels } from '@/constants/taskText';
import { radius, shadows, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { Task, TaskStatus } from '@/types';
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

function formatIndex(index?: number): string {
  return String((index ?? 0) + 1).padStart(2, '0');
}

function getStatusPillStyle(status: TaskStatus, theme: AppTheme) {
  if (status === 'completed') {
    return { color: theme.success, backgroundColor: theme.surfaceAlt };
  }

  if (status === 'partial') {
    return { color: theme.warning, backgroundColor: theme.surfaceAlt };
  }

  if (status === 'in_progress') {
    return { color: theme.primary, backgroundColor: theme.surfaceAlt };
  }

  return { color: theme.textMuted, backgroundColor: theme.surfaceAlt };
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
  const styles = createStyles(theme);
  const isCompleted = task.status === 'completed';
  const isExceeded = task.completionStatus === 'exceeded';
  const isDone = isCompleted || isExceeded;
  const focusText = formatFocusDuration(getTaskFocusSeconds(task));
  const statusText =
    task.completionStatus && task.status !== 'not_started' && task.status !== 'in_progress'
      ? completionStatusLabels[task.completionStatus]
      : statusLabels[task.status];
  const proofUri = task.proofThumbnailUri ?? task.proofImageUri;

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
      <View style={styles.header}>
        <Text style={[styles.sequence, isDone ? styles.sequenceDone : undefined]}>
          {formatIndex(index)}
        </Text>

        <View style={styles.titleGroup}>
          <View style={styles.chipRow}>
            {task.isTopThree ? <Text style={styles.majorChip}>今日三件大事</Text> : null}
            <Text style={[styles.statusChip, getStatusPillStyle(task.status, theme)]}>
              {isDone ? '已兑现' : statusText}
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {task.title}
          </Text>
        </View>

        {proofUri ? (
          <View style={styles.coverWrap}>
            <Image source={{ uri: proofUri }} style={styles.cover} />
            <View style={styles.coverBadge} />
          </View>
        ) : null}
      </View>

      <Text style={styles.criteria} numberOfLines={2}>
        {task.completionCriteria}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>预计 {task.estimatedMinutes} min</Text>
        <Text style={styles.metaText}>专注 {focusText}</Text>
        <Text style={styles.importanceText}>{importanceLabels[task.importance]}优先级</Text>
      </View>

      <View style={styles.primaryRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onStartFocus}
          style={({ pressed }) => [styles.focusButton, pressed ? styles.focusPressed : undefined]}
        >
          <Text style={styles.focusButtonText}>开始专注</Text>
          <View style={styles.focusDot} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.detailButton, pressed ? styles.detailPressed : undefined]}
        >
          <Text style={styles.detailText}>查看详情</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <MiniAction
          active={task.status === 'completed'}
          label="完成"
          onPress={() => onStatusChange?.('completed')}
          theme={theme}
        />
        <MiniAction
          active={task.status === 'partial'}
          label="部分"
          onPress={() => onStatusChange?.('partial')}
          theme={theme}
        />
        <MiniAction
          active={task.status === 'not_started'}
          label="未开始"
          onPress={() => onStatusChange?.('not_started')}
          theme={theme}
        />
        <MiniAction
          label={task.isTopThree ? '取消大事' : '设为大事'}
          onPress={onToggleTopThree}
          theme={theme}
        />
        <MiniAction danger label="删除" onPress={onDelete} theme={theme} />
      </View>
    </Pressable>
  );
}

function MiniAction({
  active = false,
  danger = false,
  label,
  onPress,
  theme,
}: {
  active?: boolean;
  danger?: boolean;
  label: string;
  onPress?: () => void;
  theme: AppTheme;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        miniStyles.action,
        {
          backgroundColor: active ? theme.primary : theme.surface,
          borderColor: active ? theme.primary : theme.border,
        },
        pressed ? miniStyles.pressed : undefined,
      ]}
    >
      <Text
        style={[
          miniStyles.text,
          {
            color: active ? theme.textOnPrimary : danger ? theme.danger : theme.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const miniStyles = StyleSheet.create({
  action: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
  text: {
    ...typography.caption,
  },
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
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
      backgroundColor: theme.surfaceAlt,
    },
    doneCard: {
      backgroundColor: theme.surfaceAlt,
      opacity: 0.88,
    },
    draggingCard: {
      ...shadows.floating,
      shadowColor: theme.primary,
      transform: [{ scale: 1.015 }],
    },
    pressed: {
      opacity: 0.94,
      transform: [{ scale: 0.992 }],
    },
    header: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.md,
    },
    sequence: {
      color: theme.primary,
      fontSize: 34,
      fontWeight: '900',
      lineHeight: 36,
      width: 48,
    },
    sequenceDone: {
      color: theme.success,
    },
    titleGroup: {
      flex: 1,
    },
    chipRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    majorChip: {
      ...typography.micro,
      color: theme.text,
      backgroundColor: theme.accent,
      borderRadius: radius.pill,
      overflow: 'hidden',
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
    },
    statusChip: {
      ...typography.micro,
      borderRadius: radius.pill,
      overflow: 'hidden',
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
    },
    title: {
      ...typography.cardTitle,
      color: theme.text,
    },
    coverWrap: {
      borderColor: theme.primary,
      borderRadius: radius.medium,
      borderWidth: 2,
      padding: 3,
    },
    cover: {
      width: 72,
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
      backgroundColor: theme.accent,
    },
    criteria: {
      ...typography.body,
      color: theme.textMuted,
      marginTop: spacing.md,
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
    },
    importanceText: {
      ...typography.caption,
      color: theme.primary,
    },
    primaryRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    focusButton: {
      minHeight: 46,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.primary,
      flexDirection: 'row',
      gap: spacing.xs,
    },
    focusPressed: {
      opacity: 0.9,
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
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      backgroundColor: theme.surfaceAlt,
    },
    detailPressed: {
      opacity: 0.84,
    },
    detailText: {
      ...typography.caption,
      color: theme.primary,
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
