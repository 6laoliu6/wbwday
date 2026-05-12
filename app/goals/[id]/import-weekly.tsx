import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { getGoalById, updateGoal } from '@/storage/goalRepository';
import { createTasks, getTasksByDate } from '@/storage/taskRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { Goal, GoalWeeklyPlanDay, ISODateString } from '@/types';
import { addDays, toDateKey } from '@/utils/date';
import { hapticError, hapticSelection, hapticSuccess, hapticWarning } from '@/utils/haptics';
import { parseGoalWeeklyPlan } from '@/utils/parseGoalWeeklyPlan';

type WeeklyDraft = GoalWeeklyPlanDay & { enabled: boolean };

const sampleText = `周一：颈肩减压 + 弹力带背部
1. 仰卧收下巴
10 次，每次 3-5 秒。

周二：泡沫轴放松 + 胸椎活动

周日：休息 / 只做舒缓`;

function getNextMonday(): ISODateString {
  const today = new Date();
  const day = today.getDay();
  const offset = day === 1 ? 7 : (8 - day) % 7 || 1;
  const next = new Date(today);
  next.setDate(today.getDate() + offset);
  return toDateKey(next);
}

function isDateKey(value: string): value is ISODateString {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function getPlanDate(weekStart: ISODateString, weekday: number): ISODateString {
  return addDays(weekStart, weekday - 1);
}

export default function ImportWeeklyPlanScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goalId = Array.isArray(id) ? id[0] : id;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [goal, setGoal] = useState<Goal | undefined>();
  const [rawText, setRawText] = useState('');
  const [drafts, setDrafts] = useState<WeeklyDraft[]>([]);
  const [weekStart, setWeekStart] = useState(getNextMonday());
  const [busy, setBusy] = useState(false);

  const loadGoal = async (): Promise<Goal | undefined> => {
    if (!goalId) return undefined;
    const nextGoal = await getGoalById(goalId);
    setGoal(nextGoal);
    return nextGoal;
  };

  const parsePlan = async () => {
    if (rawText.trim().length === 0) {
      void hapticWarning();
      Alert.alert('先粘贴周计划');
      return;
    }
    const parsed = parseGoalWeeklyPlan(rawText);
    if (parsed.length === 0) {
      void hapticWarning();
      Alert.alert('没有识别到周一到周日', '请检查文本里是否包含“周一：标题”这样的日期标题。');
      return;
    }
    const currentGoal = goal ?? (await loadGoal());
    setDrafts(parsed.map((day) => ({ ...day, enabled: true })));
    if (currentGoal) {
      await updateGoal(currentGoal.id, { weeklyPlan: parsed });
      setGoal({ ...currentGoal, weeklyPlan: parsed });
    }
    void hapticSuccess();
  };

  const updateDraft = (weekday: number, patch: Partial<WeeklyDraft>) => {
    setDrafts((current) => current.map((draft) => (draft.weekday === weekday ? { ...draft, ...patch } : draft)));
  };

  const generateTasks = async () => {
    const currentGoal = goal ?? (await loadGoal());
    if (!currentGoal || !goalId) {
      Alert.alert('没有找到这个 Goal');
      return;
    }
    if (!isDateKey(weekStart)) {
      void hapticWarning();
      Alert.alert('生成周请使用 YYYY-MM-DD 格式');
      return;
    }

    const enabledDrafts = drafts.filter((draft) => draft.enabled && draft.taskTitle.trim().length > 0);
    if (enabledDrafts.length === 0) {
      void hapticWarning();
      Alert.alert('没有可生成的任务');
      return;
    }

    setBusy(true);
    try {
      let skipped = 0;
      const inputs = [];
      for (const draft of enabledDrafts) {
        const date = getPlanDate(weekStart, draft.weekday);
        const existing = await getTasksByDate(date);
        const title = draft.taskTitle.trim();
        if (existing.some((task) => task.title.trim() === title)) {
          skipped += 1;
          continue;
        }
        inputs.push({
          date,
          title,
          completionCriteria: draft.taskCompletionStandard?.trim() ?? '',
          importance: 'medium' as const,
          estimatedMinutes: 30,
          note: `来源 Goal：${currentGoal.title}\n\n${draft.content}`,
        });
      }

      const created = await createTasks(inputs);
      await updateGoal(currentGoal.id, { weeklyPlan: drafts.map(({ enabled, ...draft }) => draft) });
      void hapticSuccess();
      Alert.alert('周计划已生成', `已生成 ${created.length} 个任务，跳过 ${skipped} 个重复任务。`, [
        { text: '好', onPress: () => router.back() },
      ]);
    } catch {
      void hapticError();
      Alert.alert('生成失败', '周计划暂时没有生成成功，请稍后再试。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.heroShape} />
            <Text style={styles.kicker}>WEEK IMPORT</Text>
            <Text style={styles.title}>导入周计划</Text>
            <Text style={styles.subtitle}>粘贴一整周安排，WBWday 会帮你拆成每天的行动。</Text>
          </View>

          <View style={styles.card}>
            <ThemedTextInput
              label="周计划文本"
              multiline
              onChangeText={setRawText}
              placeholder={sampleText}
              inputStyle={styles.rawInput}
              value={rawText}
            />
            <PrimaryButton onPress={parsePlan} variant="soft">解析周计划</PrimaryButton>
          </View>

          {drafts.length > 0 ? (
            <View style={styles.card}>
              <ThemedTextInput label="生成周的周一日期" onChangeText={setWeekStart} placeholder="YYYY-MM-DD" value={weekStart} />
              <Text style={styles.hint}>默认生成到下一周。每一天会落到对应日期，不会全部生成到今天。</Text>
            </View>
          ) : null}

          {drafts.map((draft) => {
            const date = isDateKey(weekStart) ? getPlanDate(weekStart, draft.weekday) : '日期格式错误';
            return (
              <View key={draft.weekday} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View>
                    <Text style={styles.weekday}>{draft.weekdayLabel}</Text>
                    <Text style={styles.date}>{date}</Text>
                  </View>
                  <Switch
                    onValueChange={(enabled) => {
                      updateDraft(draft.weekday, { enabled });
                      void hapticSelection();
                    }}
                    thumbColor={theme.surface}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    value={draft.enabled}
                  />
                </View>
                <Text style={styles.contentPreview} numberOfLines={4}>{draft.content}</Text>
                <ThemedTextInput
                  label="将生成的任务标题"
                  onChangeText={(taskTitle) => updateDraft(draft.weekday, { taskTitle })}
                  value={draft.taskTitle}
                />
                <ThemedTextInput
                  label="完成标准（可选）"
                  multiline
                  onChangeText={(taskCompletionStandard) => updateDraft(draft.weekday, { taskCompletionStandard })}
                  placeholder="可留空"
                  value={draft.taskCompletionStandard ?? ''}
                />
              </View>
            );
          })}

          {drafts.length > 0 ? (
            <PrimaryButton disabled={busy} onPress={generateTasks} size="large">
              {busy ? '生成中' : '生成任务'}
            </PrimaryButton>
          ) : null}
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
    hero: { overflow: 'hidden', borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.xl },
    heroShape: { position: 'absolute', right: -24, top: -30, width: 124, height: 124, borderRadius: 62, backgroundColor: theme.accent, opacity: 0.72 },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.xs },
    title: { ...typography.title, color: theme.text, fontWeight: '900' },
    subtitle: { ...typography.body, color: theme.textMuted, marginTop: spacing.xs, maxWidth: '86%' },
    card: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md },
    rawInput: { minHeight: 220 },
    hint: { ...typography.caption, color: theme.textMuted, lineHeight: 18 },
    dayCard: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md, gap: spacing.sm },
    dayHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    weekday: { ...typography.section, color: theme.primary, fontWeight: '900' },
    date: { ...typography.caption, color: theme.textMuted, marginTop: spacing.xxs },
    contentPreview: { ...typography.body, color: theme.textMuted, backgroundColor: theme.surfaceAlt, borderRadius: radius.medium, lineHeight: 22, padding: spacing.md },
  });
}