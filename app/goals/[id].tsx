import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GoalProgressGrid } from '@/components/GoalProgressGrid';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedChip } from '@/components/ThemedChip';
import { archiveGoal, getCheckInByGoalIdAndDate, getCheckInsByGoalId, getGoalById, saveCheckIn } from '@/storage/goalRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { Goal, GoalCheckIn, GoalCheckInStatus } from '@/types';
import { formatChineseDate, toDateKey } from '@/utils/date';
import { getDaysUntilTarget, getGoalCompletedCount, getGoalMissedCount, getGoalPartialCount, getGoalProgressPercent, getGoalTotalDays } from '@/utils/goalStats';
import { hapticError, hapticSelection, hapticSuccess, hapticWarning } from '@/utils/haptics';

const checkInOptions: Array<{ label: string; status: GoalCheckInStatus }> = [
  { label: '已完成', status: 'completed' },
  { label: '部分完成', status: 'partial' },
  { label: '未完成', status: 'missed' },
];

const statusText: Record<GoalCheckInStatus, string> = {
  completed: '已完成',
  partial: '部分完成',
  missed: '未完成',
};

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goalId = Array.isArray(id) ? id[0] : id;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [goal, setGoal] = useState<Goal | undefined>();
  const [checkIns, setCheckIns] = useState<GoalCheckIn[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<GoalCheckIn | undefined>();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const today = toDateKey();

  const loadGoal = useCallback(async () => {
    if (!goalId) { setLoading(false); return; }
    const [nextGoal, nextCheckIns, nextTodayCheckIn] = await Promise.all([getGoalById(goalId), getCheckInsByGoalId(goalId), getCheckInByGoalIdAndDate(goalId, today)]);
    setGoal(nextGoal);
    setCheckIns(nextCheckIns);
    setTodayCheckIn(nextTodayCheckIn);
    setNote(nextTodayCheckIn?.note ?? '');
    setLoading(false);
  }, [goalId, today]);

  useFocusEffect(useCallback(() => { void loadGoal(); }, [loadGoal]));

  const saveToday = useCallback(async (status: GoalCheckInStatus) => {
    if (!goal) return;
    try {
      void hapticSelection();
      await saveCheckIn({ goalId: goal.id, date: today, status, note: note.trim() || undefined });
      void hapticSuccess();
      Alert.alert('今天的 Goal 已记录。');
      await loadGoal();
    } catch {
      void hapticError();
      Alert.alert('保存失败', '今天的 Goal 没有记上，请稍后再试。');
    }
  }, [goal, loadGoal, note, today]);

  const confirmArchive = useCallback(() => {
    if (!goal) return;
    Alert.alert('归档 Goal', '归档后，它会从 active 列表隐藏。', [
      { text: '取消', style: 'cancel' },
      { text: '归档', style: 'destructive', onPress: async () => {
        try {
          await archiveGoal(goal.id);
          void hapticWarning();
          router.replace('/goals' as Href);
        } catch {
          void hapticError();
          Alert.alert('操作失败', '这个 Goal 暂时没有归档成功。');
        }
      } },
    ]);
  }, [goal]);

  const sortedCheckIns = useMemo(() => [...checkIns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10), [checkIns]);

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>;

  if (!goal) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.missingTitle}>{'没有找到这个 Goal。'}</Text>
        <PrimaryButton onPress={() => router.replace('/goals' as Href)} variant="soft">{'回到 Goals'}</PrimaryButton>
      </SafeAreaView>
    );
  }

  const totalDays = getGoalTotalDays(goal.startDate, goal.targetDate);
  const completedCount = getGoalCompletedCount(checkIns);
  const partialCount = getGoalPartialCount(checkIns);
  const missedCount = getGoalMissedCount(checkIns);
  const progressPercent = getGoalProgressPercent(goal, checkIns);
  const daysLeft = getDaysUntilTarget(goal.targetDate);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroShape} />
          <Text style={styles.kicker}>GOAL</Text>
          <Text style={styles.title}>{goal.title}</Text>
          {goal.description ? <Text style={styles.subtitle}>{goal.description}</Text> : null}
          {goal.dailyGoal ? <Text style={styles.dailyGoal}>{goal.dailyGoal}</Text> : null}
        </View>

        <View style={styles.metrics}>
          <Metric label="距离目标" value={`${daysLeft}`} suffix="days" />
          <Metric label="总天数" value={`${totalDays}`} suffix="days" />
          <Metric label="完成率" value={`${progressPercent}%`} />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>{'粉色进度墙'}</Text>
          <Text style={styles.sectionHint}>{'每一个小格子，都是一天的靠近。'}</Text>
          <GoalProgressGrid goal={goal} checkIns={checkIns} />
          <View style={styles.statsRow}>
            <ThemedChip label={`已点亮 ${completedCount}`} tone="success" />
            <ThemedChip label={`部分 ${partialCount}`} tone="warning" />
            <ThemedChip label={`未完成 ${missedCount}`} tone="default" />
          </View>
        </View>

        <View style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <View style={styles.weeklyCopy}>
              <Text style={styles.sectionTitle}>???</Text>
              <Text style={styles.sectionHint}>??????????????????</Text>
            </View>
            <PrimaryButton onPress={() => router.push(`/goals/${goal.id}/import-weekly` as Href)} variant="soft">
              {goal.weeklyPlan?.length ? '????' : '?????'}
            </PrimaryButton>
          </View>
          {goal.weeklyPlan?.length ? (
            <View style={styles.weeklyList}>
              {goal.weeklyPlan.slice(0, 7).map((day) => (
                <Text key={day.weekday} style={styles.weeklyItem} numberOfLines={1}>
                  {day.weekdayLabel}?{day.taskTitle || day.title}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.checkInCard}>
          <Text style={styles.sectionTitle}>{'今日打卡'}</Text>
          <Text style={styles.sectionHint}>{todayCheckIn ? `今天已记为：${statusText[todayCheckIn.status]}` : '今天还没有记录。'}</Text>
          <TextInput
            multiline
            onChangeText={setNote}
            placeholder="今天的记录，可以很短。"
            placeholderTextColor={theme.textMuted}
            selectionColor={theme.primary}
            style={styles.noteInput}
            textAlignVertical="top"
            value={note}
          />
          <View style={styles.checkInRow}>
            {checkInOptions.map((option) => (
              <ThemedChip
                active={todayCheckIn?.status === option.status}
                key={option.status}
                label={option.label}
                onPress={() => void saveToday(option.status)}
                style={styles.checkChip}
                tone={option.status === 'completed' ? 'success' : option.status === 'partial' ? 'warning' : 'default'}
              />
            ))}
          </View>
        </View>

        <View style={styles.recordsCard}>
          <Text style={styles.sectionTitle}>{'最近记录'}</Text>
          {sortedCheckIns.length === 0 ? <Text style={styles.sectionHint}>{'还没有打卡记录。'}</Text> : sortedCheckIns.map((checkIn) => (
            <View key={checkIn.id} style={styles.recordRow}>
              <View style={styles.recordCopy}>
                <Text style={styles.recordDate}>{formatChineseDate(checkIn.date)}</Text>
                {checkIn.note ? <Text style={styles.recordNote}>{checkIn.note}</Text> : null}
              </View>
              <Text style={styles.recordStatus}>{statusText[checkIn.status]}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton onPress={confirmArchive} variant="quiet">{'归档 Goal'}</PrimaryButton>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, suffix, value }: { label: string; suffix?: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.primary, fontSize: 30, fontWeight: '900', lineHeight: 34 }}>{value}</Text>
      <Text style={{ ...typography.micro, color: theme.textMuted, fontWeight: '900' }}>{suffix}</Text>
      <Text style={{ ...typography.caption, color: theme.textMuted, marginTop: spacing.xxs }}>{label}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: theme.background, padding: spacing.lg },
    content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.md },
    hero: { overflow: 'hidden', borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.xl, minHeight: 180 },
    heroShape: { position: 'absolute', right: -26, top: -32, width: 142, height: 142, borderRadius: 71, backgroundColor: '#FFB6D2' },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.xs },
    title: { ...typography.title, color: theme.text, fontWeight: '900' },
    subtitle: { ...typography.body, color: theme.textMuted, marginTop: spacing.xs, maxWidth: '86%' },
    dailyGoal: { ...typography.caption, color: theme.primary, marginTop: spacing.md, backgroundColor: theme.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignSelf: 'flex-start' },
    metrics: { flexDirection: 'row', gap: spacing.sm, borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md },
    summaryCard: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md, gap: spacing.md },
    checkInCard: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md, gap: spacing.md },
    recordsCard: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md, gap: spacing.sm },
    weeklyCard: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md, gap: spacing.md },
    weeklyHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
    weeklyCopy: { flex: 1 },
    weeklyList: { gap: spacing.xs },
    weeklyItem: { ...typography.caption, color: theme.textMuted, fontWeight: '800' },
    sectionTitle: { ...typography.section, color: theme.text, fontWeight: '900' },
    sectionHint: { ...typography.caption, color: theme.textMuted, lineHeight: 18 },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    noteInput: { minHeight: 92, borderColor: theme.border, borderRadius: radius.medium, borderWidth: 1, backgroundColor: theme.surfaceAlt, color: theme.text, fontSize: 15, lineHeight: 22, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    checkInRow: { flexDirection: 'row', gap: spacing.xs },
    checkChip: { flex: 1, minHeight: 44 },
    recordRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: theme.border, borderBottomWidth: 1, gap: spacing.md, paddingVertical: spacing.sm },
    recordCopy: { flex: 1 },
    recordDate: { ...typography.body, color: theme.text, fontWeight: '900' },
    recordNote: { ...typography.caption, color: theme.textMuted, marginTop: spacing.xxs },
    recordStatus: { ...typography.caption, color: theme.primary, fontWeight: '900' },
    missingTitle: { ...typography.section, color: theme.text, textAlign: 'center' },
  });
}
