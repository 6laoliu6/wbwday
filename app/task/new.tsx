import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/theme';
import { createTask } from '@/storage/taskRepository';
import type { TaskImportance } from '@/types';

const importanceOptions: Array<{ label: string; value: TaskImportance }> = [
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
];

function isTopThreeLimitError(error: unknown): boolean {
  return error instanceof Error && error.message === 'TOP_THREE_LIMIT_REACHED';
}

export default function NewTaskScreen() {
  const [title, setTitle] = useState('');
  const [completionCriteria, setCompletionCriteria] = useState('');
  const [importance, setImportance] = useState<TaskImportance>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState('30');
  const [note, setNote] = useState('');
  const [isTopThree, setIsTopThree] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && completionCriteria.trim().length > 0 && Number(estimatedMinutes) > 0,
    [completionCriteria, estimatedMinutes, title],
  );

  const submit = async () => {
    if (!canSubmit || saving) {
      return;
    }

    setSaving(true);

    try {
      await createTask({
        title,
        completionCriteria,
        importance,
        estimatedMinutes: Number(estimatedMinutes),
        note,
        isTopThree,
      });
      router.back();
    } catch (error) {
      if (isTopThreeLimitError(error)) {
        Alert.alert('今日三件大事已满', '最多只能设置 3 个任务为今日三件大事。');
        setSaving(false);
        return;
      }

      Alert.alert('保存失败', '任务没有保存成功，请稍后再试。');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>写下今天的一件事</Text>

          <View style={styles.field}>
            <Text style={styles.label}>任务名称</Text>
            <TextInput
              onChangeText={setTitle}
              placeholder="例如：完成第一阶段 App 骨架"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={title}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>完成标准</Text>
            <TextInput
              multiline
              onChangeText={setCompletionCriteria}
              placeholder="写清楚做到什么程度才算完成"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.textArea]}
              value={completionCriteria}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>重要程度</Text>
            <View style={styles.segmented}>
              {importanceOptions.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  key={option.value}
                  onPress={() => setImportance(option.value)}
                  style={[
                    styles.segment,
                    importance === option.value ? styles.segmentActive : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      importance === option.value ? styles.segmentTextActive : undefined,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>预计时间</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={setEstimatedMinutes}
              placeholder="分钟"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={estimatedMinutes}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.label}>设为今日三件大事</Text>
              <Text style={styles.helper}>会在任务卡片上突出显示</Text>
            </View>
            <Switch
              onValueChange={setIsTopThree}
              thumbColor={colors.surface}
              trackColor={{ false: colors.border, true: colors.accent }}
              value={isTopThree}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>备注</Text>
            <TextInput
              multiline
              onChangeText={setNote}
              placeholder="可选：补充背景、限制或提醒"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.textArea]}
              value={note}
            />
          </View>

          <PrimaryButton disabled={!canSubmit || saving} onPress={submit}>
            {saving ? '保存中' : '保存到今日'}
          </PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 44,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 32,
    marginBottom: 20,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  helper: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    minHeight: 48,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
  segmented: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  segmentActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  segmentText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.surface,
  },
  switchRow: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    padding: 14,
  },
  switchCopy: {
    flex: 1,
    paddingRight: 12,
  },
});
