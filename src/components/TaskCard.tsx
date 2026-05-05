import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { completionStatusLabels, importanceLabels, statusLabels } from '@/constants/taskText';
import type { Task, TaskStatus } from '@/types';
import { formatFocusDuration, getTaskFocusSeconds } from '@/utils/time';

type TaskCardProps = {
  task: Task;
  isDragging?: boolean;
  onDelete?: () => void;
  onLongPress?: () => void;
  onPress?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  onToggleTopThree?: () => void;
};

export function TaskCard({
  task,
  isDragging = false,
  onDelete,
  onLongPress,
  onPress,
  onStatusChange,
  onToggleTopThree,
}: TaskCardProps) {
  const isCompleted = task.status === 'completed';
  const focusText = formatFocusDuration(getTaskFocusSeconds(task));
  const statusText = task.completionStatus && task.status !== 'not_started' && task.status !== 'in_progress'
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
        isCompleted ? styles.completedCard : undefined,
        isDragging ? styles.draggingCard : undefined,
        pressed && onPress ? styles.pressed : undefined,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          {task.isTopThree ? <Text style={styles.topThreeLabel}>今日三件大事</Text> : null}
          <Text style={[styles.title, isCompleted ? styles.completedText : undefined]} numberOfLines={2}>
            {task.title}
          </Text>
        </View>

        <View style={[styles.importance, styles[task.importance]]}>
          <Text style={styles.importanceText}>{importanceLabels[task.importance]}</Text>
        </View>
      </View>

      <Text style={[styles.criteria, isCompleted ? styles.completedText : undefined]} numberOfLines={3}>
        完成标准：{task.completionCriteria}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>预计 {task.estimatedMinutes} 分钟</Text>
        <Text style={styles.metaText}>专注 {focusText}</Text>
      </View>

      <View style={styles.footer}>
        <View style={[styles.statusPill, styles[`${task.status}Pill`]]}>
          <Text style={[styles.statusText, isCompleted ? styles.completedStatusText : undefined]}>
            {isCompleted ? '✓ ' : ''}
            {statusText}
          </Text>
        </View>

        {proofUri ? (
          <Image source={{ uri: proofUri }} style={styles.thumbnail} />
        ) : null}
      </View>

      <Text style={styles.dragHint}>长按卡片拖动排序，越靠上越重要</Text>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onStatusChange?.('completed')}
          style={[styles.actionButton, task.status === 'completed' ? styles.actionActive : undefined]}
        >
          <Text
            style={[
              styles.actionText,
              task.status === 'completed' ? styles.actionActiveText : undefined,
            ]}
          >
            完成
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onStatusChange?.('partial')}
          style={[styles.actionButton, task.status === 'partial' ? styles.actionActive : undefined]}
        >
          <Text
            style={[
              styles.actionText,
              task.status === 'partial' ? styles.actionActiveText : undefined,
            ]}
          >
            部分完成
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onStatusChange?.('not_started')}
          style={[
            styles.actionButton,
            task.status === 'not_started' ? styles.actionActiveSoft : undefined,
          ]}
        >
          <Text style={styles.actionText}>未开始</Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={onToggleTopThree} style={styles.actionButton}>
          <Text style={styles.actionText}>{task.isTopThree ? '取消大事' : '设为大事'}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={onDelete} style={[styles.actionButton, styles.deleteButton]}>
          <Text style={[styles.actionText, styles.deleteText]}>删除</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  topThreeCard: {
    borderColor: colors.accent,
    borderLeftWidth: 5,
    backgroundColor: '#FFFDFC',
  },
  completedCard: {
    opacity: 0.72,
  },
  draggingCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    transform: [{ scale: 1.01 }],
  },
  pressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleGroup: {
    flex: 1,
  },
  topThreeLabel: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 25,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  importance: {
    minWidth: 34,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  high: {
    backgroundColor: '#F4D7CF',
  },
  medium: {
    backgroundColor: '#F5E4BD',
  },
  low: {
    backgroundColor: '#DCE8D7',
  },
  importanceText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  criteria: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  metaText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  not_startedPill: {
    backgroundColor: colors.surfaceSoft,
  },
  in_progressPill: {
    backgroundColor: '#E6EDF6',
  },
  completedPill: {
    backgroundColor: '#DCE8D7',
  },
  partialPill: {
    backgroundColor: '#F5E4BD',
  },
  statusText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  completedStatusText: {
    color: colors.success,
  },
  thumbnail: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
  },
  dragHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  actionRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
  },
  actionButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  actionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionActiveSoft: {
    backgroundColor: colors.surfaceSoft,
  },
  actionText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  actionActiveText: {
    color: colors.surface,
  },
  deleteButton: {
    borderColor: '#E7C9C2',
  },
  deleteText: {
    color: colors.danger,
  },
});
