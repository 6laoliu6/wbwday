import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedChip } from './ThemedChip';
import { ThemedTextInput } from './ThemedTextInput';
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
          <Text style={styles.cardHint}>保存前可以继续微调</Text>
        </View>
        <ThemedChip
          label="删除"
          onPress={() => {
            void hapticWarning();
            onDelete();
          }}
          tone="danger"
        />
      </View>

      <ThemedTextInput
        label="任务名称"
        onChangeText={(title) => onChange({ ...draft, title })}
        placeholder="任务名称"
        value={draft.title}
      />

      <ThemedTextInput
        label="完成标准（可选）"
        multiline
        onChangeText={(completionStandard) => onChange({ ...draft, completionStandard })}
        placeholder="可选：做到什么程度才算完成"
        inputStyle={styles.standardInput}
        value={draft.completionStandard}
      />

      <View style={styles.field}>
        <Text style={styles.label}>重要程度</Text>
        <View style={styles.segmented}>
          {importanceOptions.map((importance) => (
            <ThemedChip
              active={draft.importance === importance}
              key={importance}
              label={importanceLabels[importance]}
              onPress={() => {
                onChange({ ...draft, importance });
                void hapticSelection();
              }}
              style={styles.flexChip}
              tone="primary"
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>预计时间</Text>
        <View style={styles.minuteRow}>
          {estimatedMinuteOptions.map((minutes) => (
            <ThemedChip
              active={draft.estimatedMinutes === minutes}
              key={minutes}
              label={`${minutes} 分钟`}
              onPress={() => {
                onChange({ ...draft, estimatedMinutes: minutes });
                void hapticSelection();
              }}
              tone="primary"
            />
          ))}
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

      <ThemedTextInput
        label="备注"
        multiline
        onChangeText={(note) => onChange({ ...draft, note })}
        placeholder="可选"
        inputStyle={styles.noteInput}
        value={draft.note}
      />
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
    indexText: { ...typography.caption, color: theme.textOnPrimary, fontWeight: '900' },
    headerCopy: { flex: 1 },
    cardTitle: { ...typography.cardTitle, color: theme.text, fontWeight: '900' },
    cardHint: { ...typography.caption, color: theme.textMuted, fontWeight: '800', marginTop: spacing.xxs },
    field: { marginBottom: spacing.md },
    label: { ...typography.caption, color: theme.text, fontWeight: '900', marginBottom: spacing.xs },
    standardInput: { minHeight: 86 },
    noteInput: { minHeight: 72 },
    segmented: { flexDirection: 'row', gap: spacing.sm },
    flexChip: { flex: 1 },
    minuteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    customMinutes: {
      minWidth: 96,
      minHeight: 40,
      borderColor: theme.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
    },
    customActive: { borderColor: theme.primary },
    customInput: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '900',
      minHeight: 38,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
  });
}
