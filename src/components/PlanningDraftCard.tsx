import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { importanceLabels } from '@/constants/taskText';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { TaskDraft, TaskImportance } from '@/types';
import { hapticSelection, hapticWarning } from '@/utils/haptics';

const importanceOptions: TaskImportance[] = ['high', 'medium', 'low'];
const estimatedMinuteOptions = [15, 30, 60];

type PlanningDraftCardProps = {
  draft: TaskDraft;
  index: number;
  onChange: (draft: TaskDraft) => void;
  onDelete: () => void;
};

export function PlanningDraftCard({ draft, index, onChange, onDelete }: PlanningDraftCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isCustomEstimatedMinutes = !estimatedMinuteOptions.includes(draft.estimatedMinutes);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.cardTitle}>任务草稿</Text>
          <Text style={styles.cardHint}>保存前可以微调它</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void hapticWarning();
            onDelete();
          }}
          style={({ pressed }) => [styles.deleteButton, pressed ? styles.pressed : undefined]}
        >
          <Text style={styles.deleteText}>删除</Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>任务名称</Text>
        <TextInput
          onChangeText={(title) => onChange({ ...draft, title })}
          placeholder="任务名称"
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.primary}
          style={styles.input}
          value={draft.title}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>完成标准</Text>
        <TextInput
          multiline
          onChangeText={(completionStandard) => onChange({ ...draft, completionStandard })}
          placeholder="做到什么程度才算完成"
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.primary}
          style={[styles.input, styles.textArea]}
          textAlignVertical="top"
          value={draft.completionStandard}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>重要程度</Text>
        <View style={styles.segmented}>
          {importanceOptions.map((importance) => {
            const active = draft.importance === importance;

            return (
              <Pressable
                accessibilityRole="button"
                key={importance}
                onPress={() => {
                  onChange({ ...draft, importance });
                  void hapticSelection();
                }}
                style={({ pressed }) => [
                  styles.segment,
                  active ? styles.segmentActive : undefined,
                  pressed ? styles.pressed : undefined,
                ]}
              >
                <Text style={[styles.segmentText, active ? styles.segmentTextActive : undefined]}>
                  {importanceLabels[importance]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>预计时间</Text>
        <View style={styles.minuteRow}>
          {estimatedMinuteOptions.map((minutes) => {
            const active = draft.estimatedMinutes === minutes;

            return (
              <Pressable
                accessibilityRole="button"
                key={minutes}
                onPress={() => {
                  onChange({ ...draft, estimatedMinutes: minutes });
                  void hapticSelection();
                }}
                style={({ pressed }) => [
                  styles.minuteButton,
                  active ? styles.minuteButtonActive : undefined,
                  pressed ? styles.pressed : undefined,
                ]}
              >
                <Text style={[styles.minuteText, active ? styles.minuteTextActive : undefined]}>
                  {minutes} 分钟
                </Text>
              </Pressable>
            );
          })}
          <View style={[styles.customMinutes, isCustomEstimatedMinutes ? styles.customActive : undefined]}>
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) =>
                onChange({ ...draft, estimatedMinutes: Math.max(1, Number(value) || 1) })
              }
              placeholder="自定义"
              placeholderTextColor={theme.textMuted}
              selectionColor={theme.primary}
              style={styles.customInput}
              value={isCustomEstimatedMinutes ? String(draft.estimatedMinutes) : ''}
            />
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>备注</Text>
        <TextInput
          multiline
          onChangeText={(note) => onChange({ ...draft, note })}
          placeholder="可选"
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.primary}
          style={[styles.input, styles.noteArea]}
          textAlignVertical="top"
          value={draft.note}
        />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderWidth: 1,
      backgroundColor: theme.surface,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    indexBadge: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.medium,
      backgroundColor: theme.primary,
    },
    indexText: {
      ...typography.caption,
      color: theme.textOnPrimary,
      fontWeight: '900',
    },
    headerCopy: {
      flex: 1,
    },
    cardTitle: {
      ...typography.cardTitle,
      color: theme.text,
      fontWeight: '900',
    },
    cardHint: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: '800',
      marginTop: spacing.xxs,
    },
    deleteButton: {
      borderColor: theme.danger,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    deleteText: {
      ...typography.caption,
      color: theme.danger,
      fontWeight: '900',
    },
    field: {
      marginBottom: spacing.md,
    },
    label: {
      ...typography.caption,
      color: theme.text,
      fontWeight: '900',
      marginBottom: spacing.xs,
    },
    input: {
      minHeight: 48,
      borderColor: theme.border,
      borderRadius: radius.medium,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
      color: theme.text,
      fontSize: 15,
      lineHeight: 22,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    textArea: {
      minHeight: 86,
    },
    noteArea: {
      minHeight: 72,
    },
    segmented: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    segment: {
      flex: 1,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: theme.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
    },
    segmentActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    segmentText: {
      ...typography.caption,
      color: theme.text,
      fontWeight: '900',
    },
    segmentTextActive: {
      color: theme.textOnPrimary,
    },
    minuteRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    minuteButton: {
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: theme.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
      paddingHorizontal: spacing.sm,
    },
    minuteButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    minuteText: {
      ...typography.caption,
      color: theme.text,
      fontWeight: '900',
    },
    minuteTextActive: {
      color: theme.textOnPrimary,
    },
    customMinutes: {
      minWidth: 96,
      minHeight: 40,
      borderColor: theme.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
    },
    customActive: {
      borderColor: theme.primary,
    },
    customInput: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '900',
      minHeight: 38,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    pressed: {
      opacity: 0.84,
      transform: [{ scale: 0.985 }],
    },
  });
}
