import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/theme';
import { importanceLabels } from '@/constants/taskText';
import type { TaskDraft, TaskImportance } from '@/types';

const importanceOptions: TaskImportance[] = ['high', 'medium', 'low'];
const estimatedMinuteOptions = [15, 30, 60];

type PlanningDraftCardProps = {
  draft: TaskDraft;
  index: number;
  onChange: (draft: TaskDraft) => void;
  onDelete: () => void;
};

export function PlanningDraftCard({ draft, index, onChange, onDelete }: PlanningDraftCardProps) {
  const isCustomEstimatedMinutes = !estimatedMinuteOptions.includes(draft.estimatedMinutes);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardTitle}>任务草稿 {index + 1}</Text>
        <Pressable accessibilityRole="button" onPress={onDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>删除</Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>任务名称</Text>
        <TextInput
          onChangeText={(title) => onChange({ ...draft, title })}
          placeholder="任务名称"
          placeholderTextColor={colors.muted}
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
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.textArea]}
          value={draft.completionStandard}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>重要程度</Text>
        <View style={styles.segmented}>
          {importanceOptions.map((importance) => (
            <Pressable
              accessibilityRole="button"
              key={importance}
              onPress={() => onChange({ ...draft, importance })}
              style={[
                styles.segment,
                draft.importance === importance ? styles.segmentActive : undefined,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  draft.importance === importance ? styles.segmentTextActive : undefined,
                ]}
              >
                {importanceLabels[importance]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>预计时间</Text>
        <View style={styles.minuteRow}>
          {estimatedMinuteOptions.map((minutes) => (
            <Pressable
              accessibilityRole="button"
              key={minutes}
              onPress={() => onChange({ ...draft, estimatedMinutes: minutes })}
              style={[
                styles.minuteButton,
                draft.estimatedMinutes === minutes ? styles.minuteButtonActive : undefined,
              ]}
            >
              <Text
                style={[
                  styles.minuteText,
                  draft.estimatedMinutes === minutes ? styles.minuteTextActive : undefined,
                ]}
              >
                {minutes} 分钟
              </Text>
            </Pressable>
          ))}
          <View style={[styles.customMinutes, isCustomEstimatedMinutes ? styles.customActive : undefined]}>
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) =>
                onChange({ ...draft, estimatedMinutes: Math.max(1, Number(value) || 1) })
              }
              placeholder="自定义"
              placeholderTextColor={colors.muted}
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
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.noteArea]}
          value={draft.note}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    marginBottom: 14,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  deleteButton: {
    borderColor: '#E7C9C2',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '900',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  input: {
    minHeight: 46,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  noteArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  segmented: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background,
  },
  segmentActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  segmentText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: colors.surface,
  },
  minuteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  minuteButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
  },
  minuteButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  minuteText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  minuteTextActive: {
    color: colors.surface,
  },
  customMinutes: {
    minWidth: 92,
    minHeight: 38,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background,
  },
  customActive: {
    borderColor: colors.accent,
  },
  customInput: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
});
