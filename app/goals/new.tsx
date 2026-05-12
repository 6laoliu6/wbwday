import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { createGoal } from '@/storage/goalRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { ISODateString } from '@/types';
import { toDateKey } from '@/utils/date';
import { hapticError, hapticSuccess } from '@/utils/haptics';

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

export default function NewGoalScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(toDateKey());
  const [targetDate, setTargetDate] = useState('');
  const [dailyGoal, setDailyGoal] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const saveGoal = async () => {
    if (saving) return;

    const normalizedTitle = title.trim();
    const normalizedStartDate = startDate.trim();
    const normalizedTargetDate = targetDate.trim();

    if (normalizedTitle.length === 0) {
      Alert.alert('先写下 Goal 名称。');
      return;
    }
    if (!isDateKey(normalizedStartDate)) {
      Alert.alert('开始日期请使用 YYYY-MM-DD。');
      return;
    }
    if (!isDateKey(normalizedTargetDate)) {
      Alert.alert('目标日期请使用 YYYY-MM-DD。');
      return;
    }
    if (normalizedTargetDate < normalizedStartDate) {
      Alert.alert('目标日期不能早于开始日期。');
      return;
    }

    setSaving(true);

    try {
      const goal = await createGoal({
        title: normalizedTitle,
        startDate: normalizedStartDate as ISODateString,
        targetDate: normalizedTargetDate as ISODateString,
        dailyGoal: dailyGoal.trim() || undefined,
        description: description.trim() || undefined,
      });
      void hapticSuccess();
      Alert.alert('Goal 已保存', undefined, [
        { text: '好', onPress: () => router.replace(`/goals/${goal.id}` as Href) },
      ]);
    } catch {
      void hapticError();
      Alert.alert('保存失败', 'Goal 没有保存成功，请稍后再试。');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.heroShape} />
            <Text style={styles.kicker}>NEW GOAL</Text>
            <Text style={styles.title}>{'写下一个长期目标'}</Text>
            <Text style={styles.subtitle}>{'它不需要今天完成，但今天可以靠近一点。'}</Text>
          </View>

          <View style={styles.form}>
            <ThemedTextInput label="Goal 名称" value={title} onChangeText={setTitle} placeholder="英语四级" />
            <ThemedTextInput label="开始日期" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
            <ThemedTextInput label="目标日期" value={targetDate} onChangeText={setTargetDate} placeholder="2026-06-15" />
            <ThemedTextInput label="每日行动" value={dailyGoal} onChangeText={setDailyGoal} placeholder="每天背单词、听力、阅读" multiline />
            <ThemedTextInput label="备注" value={description} onChangeText={setDescription} placeholder="6 月考试前完成基础复习" multiline />
          </View>

          <PrimaryButton disabled={saving} onPress={saveGoal} size="large">
            {saving ? '保存中' : '保存 Goal'}
          </PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    keyboard: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.md },
    hero: {
      overflow: 'hidden',
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderWidth: 1,
      backgroundColor: theme.surface,
      padding: spacing.xl,
    },
    heroShape: {
      position: 'absolute',
      right: -18,
      top: -22,
      width: 104,
      height: 88,
      borderRadius: radius.large,
      backgroundColor: '#FFB6D2',
      transform: [{ rotate: '-10deg' }],
    },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.xs },
    title: { ...typography.title, color: theme.text, fontWeight: '900' },
    subtitle: { ...typography.body, color: theme.textMuted, marginTop: spacing.xs, maxWidth: '86%' },
    form: {
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderWidth: 1,
      backgroundColor: theme.surface,
      padding: spacing.md,
    },
  });
}
