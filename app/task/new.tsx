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
import { createTask } from '@/storage/taskRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { TaskImportance } from '@/types';
import { hapticError, hapticSelection, hapticSuccess, hapticWarning } from '@/utils/haptics';

const importanceOptions: Array<{ label: string; value: TaskImportance }> = [
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
];

function isTopThreeLimitError(error: unknown): boolean {
  return error instanceof Error && error.message === 'TOP_THREE_LIMIT_REACHED';
}

export default function NewTaskScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
      void hapticSuccess();
      router.back();
    } catch (error) {
      if (isTopThreeLimitError(error)) {
        void hapticWarning();
        Alert.alert('今日三件大事已满', '最多只能设置 3 个任务为今日三件大事。');
        setSaving(false);
        return;
      }

      void hapticError();
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
          <View style={styles.hero}>
            <View style={styles.heroShape} />
            <Text style={styles.kicker}>QUICK INTENT</Text>
            <Text style={styles.title}>写下今天的一件事</Text>
            <Text style={styles.description}>把“做什么”和“做到什么程度”分开写清楚。</Text>
          </View>

          <View style={styles.formPanel}>
            <View style={styles.field}>
              <Text style={styles.label}>任务名称</Text>
              <TextInput
                onChangeText={setTitle}
                placeholder="例如：完成第一阶段 App 骨架"
                placeholderTextColor={theme.textMuted}
                selectionColor={theme.primary}
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
                placeholderTextColor={theme.textMuted}
                selectionColor={theme.primary}
                style={[styles.input, styles.textArea]}
                textAlignVertical="top"
                value={completionCriteria}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>重要程度</Text>
              <View style={styles.segmented}>
                {importanceOptions.map((option) => {
                  const active = importance === option.value;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={option.value}
                      onPress={() => {
                        setImportance(option.value);
                        void hapticSelection();
                      }}
                      style={({ pressed }) => [
                        styles.segment,
                        active ? styles.segmentActive : undefined,
                        pressed ? styles.pressed : undefined,
                      ]}
                    >
                      <Text style={[styles.segmentText, active ? styles.segmentTextActive : undefined]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>预计时间</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setEstimatedMinutes}
                placeholder="分钟"
                placeholderTextColor={theme.textMuted}
                selectionColor={theme.primary}
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
                onValueChange={(value) => {
                  setIsTopThree(value);
                  void hapticSelection();
                }}
                thumbColor={theme.surface}
                trackColor={{ false: theme.border, true: theme.primary }}
                value={isTopThree}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>备注</Text>
              <TextInput
                multiline
                onChangeText={setNote}
                placeholder="可选：补充背景、限制或提醒"
                placeholderTextColor={theme.textMuted}
                selectionColor={theme.primary}
                style={[styles.input, styles.textArea]}
                textAlignVertical="top"
                value={note}
              />
            </View>
          </View>

          <PrimaryButton disabled={!canSubmit || saving} onPress={submit} size="large">
            {saving ? '保存中' : '保存到今日'}
          </PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboard: {
      flex: 1,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    hero: {
      overflow: 'hidden',
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderWidth: 1,
      backgroundColor: theme.surface,
      marginBottom: spacing.md,
      padding: spacing.xl,
    },
    heroShape: {
      position: 'absolute',
      right: -22,
      top: -24,
      width: 110,
      height: 86,
      borderRadius: radius.large,
      backgroundColor: theme.accent,
      transform: [{ rotate: '-10deg' }],
    },
    kicker: {
      ...typography.micro,
      color: theme.primary,
      fontWeight: '900',
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.title,
      color: theme.text,
      fontWeight: '900',
      marginBottom: spacing.sm,
    },
    description: {
      ...typography.body,
      color: theme.textMuted,
      lineHeight: 22,
      maxWidth: '86%',
    },
    formPanel: {
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderWidth: 1,
      backgroundColor: theme.surface,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    field: {
      marginBottom: spacing.md,
    },
    label: {
      ...typography.body,
      color: theme.text,
      fontWeight: '900',
      marginBottom: spacing.xs,
    },
    helper: {
      ...typography.caption,
      color: theme.textMuted,
      lineHeight: 18,
    },
    input: {
      minHeight: 50,
      borderColor: theme.border,
      borderRadius: radius.medium,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
      color: theme.text,
      fontSize: 16,
      lineHeight: 23,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    textArea: {
      minHeight: 106,
    },
    segmented: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    segment: {
      flex: 1,
      minHeight: 46,
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
      ...typography.body,
      color: theme.text,
      fontWeight: '900',
    },
    segmentTextActive: {
      color: theme.textOnPrimary,
    },
    switchRow: {
      alignItems: 'center',
      borderColor: theme.border,
      borderRadius: radius.large,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    switchCopy: {
      flex: 1,
      paddingRight: spacing.sm,
    },
    pressed: {
      opacity: 0.84,
      transform: [{ scale: 0.985 }],
    },
  });
}
