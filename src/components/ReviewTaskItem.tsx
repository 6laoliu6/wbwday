import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import { completionStatusLabels, statusLabels } from '@/constants/taskText';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { CompletionProof, Task } from '@/types';
import { getProofImageUri } from '@/utils/reviewStats';
import { formatFocusDuration, getTaskFocusSeconds } from '@/utils/time';

type ReviewTaskItemProps = {
  task: Task;
  proof?: CompletionProof;
  onPress?: () => void;
  onMoveToTomorrow?: () => void;
  onMarkPartial?: () => void;
  onSkip?: () => void;
  showUnfinishedActions?: boolean;
};

export function ReviewTaskItem({
  task,
  proof,
  onPress,
  onMoveToTomorrow,
  onMarkPartial,
  onSkip,
  showUnfinishedActions = false,
}: ReviewTaskItemProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const proofUri = getProofImageUri(proof);
  const completionLabel = proof?.completionStatus
    ? completionStatusLabels[proof.completionStatus]
    : task.completionStatus
      ? completionStatusLabels[task.completionStatus]
      : statusLabels[task.status];
  const isPartial = proof?.completionStatus === 'partial' || task.status === 'partial';
  const isCompleted =
    proof?.completionStatus === 'completed' ||
    proof?.completionStatus === 'exceeded' ||
    task.status === 'completed';

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isCompleted ? styles.completedCard : undefined,
        pressed && onPress ? styles.pressed : undefined,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.criteria}>完成标准：{task.completionCriteria}</Text>
        </View>
        {proofUri ? (
          <View style={styles.thumbnailFrame}>
            <Image source={{ uri: proofUri }} style={styles.thumbnail} />
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.statusChip, isPartial ? styles.partialChip : isCompleted ? styles.completedChip : undefined]}>
          <Text style={[styles.statusText, isPartial || isCompleted ? styles.statusTextOnTone : undefined]}>
            {completionLabel}
          </Text>
        </View>
        <Text style={styles.metaText}>专注 {formatFocusDuration(getTaskFocusSeconds(task))}</Text>
      </View>

      {proof?.actualResult ? <Text style={styles.detail}>实际完成：{proof.actualResult}</Text> : null}
      {proof?.note ? <Text style={styles.detail}>完成感想：{proof.note}</Text> : null}

      {showUnfinishedActions ? (
        <View style={styles.actions}>
          <PrimaryButton onPress={onMoveToTomorrow} variant="soft">
            移到明天
          </PrimaryButton>
          <PrimaryButton onPress={onMarkPartial} variant="ghost">
            标记部分完成
          </PrimaryButton>
          <PrimaryButton onPress={onSkip} variant="quiet">
            暂不处理
          </PrimaryButton>
        </View>
      ) : null}
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      borderColor: theme.border,
      borderRadius: radius.large,
      borderWidth: 1,
      backgroundColor: theme.surface,
      marginBottom: spacing.sm,
      padding: spacing.md,
    },
    completedCard: {
      backgroundColor: theme.surfaceAlt,
    },
    pressed: {
      opacity: 0.86,
      transform: [{ scale: 0.99 }],
    },
    header: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.md,
    },
    copy: {
      flex: 1,
    },
    title: {
      ...typography.cardTitle,
      color: theme.text,
      fontWeight: '900',
      lineHeight: 23,
      marginBottom: spacing.xs,
    },
    criteria: {
      ...typography.caption,
      color: theme.textMuted,
      lineHeight: 19,
    },
    thumbnailFrame: {
      overflow: 'hidden',
      borderColor: theme.accent,
      borderRadius: radius.medium,
      borderWidth: 2,
      backgroundColor: theme.surfaceAlt,
    },
    thumbnail: {
      width: 62,
      height: 62,
      backgroundColor: theme.surfaceAlt,
    },
    metaRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    statusChip: {
      borderRadius: radius.pill,
      backgroundColor: theme.surfaceAlt,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    completedChip: {
      backgroundColor: theme.success,
    },
    partialChip: {
      backgroundColor: theme.warning,
    },
    statusText: {
      ...typography.caption,
      color: theme.text,
      fontWeight: '900',
    },
    statusTextOnTone: {
      color: '#FFFFFF',
    },
    metaText: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: '900',
    },
    detail: {
      ...typography.caption,
      color: theme.textMuted,
      lineHeight: 20,
      marginTop: spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
  });
}
