import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyStateBlock } from '@/components/EmptyStateBlock';
import { GoalProgressGrid } from '@/components/GoalProgressGrid';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedChip } from '@/components/ThemedChip';
import { getActiveGoals, getCheckInByGoalIdAndDate, getCheckInsByGoalId, saveCheckIn } from '@/storage/goalRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { Goal, GoalCheckIn, GoalCheckInStatus } from '@/types';
import { toDateKey } from '@/utils/date';
import { getDaysUntilTarget, getGoalCompletedCount, getGoalPartialCount, getGoalProgressPercent, getGoalTotalDays } from '@/utils/goalStats';
import { hapticError, hapticSelection, hapticSuccess } from '@/utils/haptics';

type GoalRow = { goal: Goal; checkIns: GoalCheckIn[]; todayCheckIn?: GoalCheckIn };

const checkInOptions: Array<{ label: string; status: GoalCheckInStatus }> = [
  { label: '已完成', status: 'completed' },
  { label: '部分', status: 'partial' },
  { label: '未完成', status: 'missed' },
];

const statusText: Record<GoalCheckInStatus, string> = {
  completed: '已完成',
  partial: '部分完成',
  missed: '未完成',
};

export default function GoalsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const today = toDateKey();

  const loadGoals = useCallback(async () => {
    try {
      const goals = await getActiveGoals();
      const nextRows = await Promise.all(goals.map(async (goal) => {
        const [checkIns, todayCheckIn] = await Promise.all([getCheckInsByGoalId(goal.id), getCheckInByGoalIdAndDate(goal.id, today)]);
        return { goal, checkIns, todayCheckIn };
      }));
      setRows(nextRows);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useFocusEffect(useCallback(() => { void loadGoals(); }, [loadGoals]));

  const checkInToday = useCallback(async (goal: Goal, status: GoalCheckInStatus) => {
    try {
      void hapticSelection();
      await saveCheckIn({ goalId: goal.id, date: today, status });
      void hapticSuccess();
      await loadGoals();
    } catch {
      void hapticError();
      Alert.alert('保存失败', '今天的 Goal 没有记上，请稍后再试。');
    }
  }, [loadGoals, today]);

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroShape} />
          <Text style={styles.kicker}>GOALS</Text>
          <Text style={styles.title}>Goals</Text>
          <Text style={styles.subtitle}>{'把远方的目标，拆成每天的一点点。'}</Text>
        </View>

        <PrimaryButton onPress={() => router.push('/goals/new' as Href)} size="large">{'新建 Goal'}</PrimaryButton>

        {rows.length === 0 ? (
          <EmptyStateBlock title="还没有 Goal" body="先写下一个值得慢慢靠近的目标。" />
        ) : (
          <View style={styles.list}>
            {rows.map(({ goal, checkIns, todayCheckIn }) => {
              const totalDays = getGoalTotalDays(goal.startDate, goal.targetDate);
              const completedCount = getGoalCompletedCount(checkIns);
              const partialCount = getGoalPartialCount(checkIns);
              const progressPercent = getGoalProgressPercent(goal, checkIns);
              const daysLeft = getDaysUntilTarget(goal.targetDate);

              return (
                <View key={goal.id} style={styles.card}>
                  <Pressable accessibilityRole="button" onPress={() => router.push(`/goals/${goal.id}` as Href)} style={({ pressed }) => [styles.cardPress, pressed ? styles.pressed : undefined]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.countdownBox}>
                        <Text style={styles.countdownValue}>{daysLeft}</Text>
                        <Text style={styles.countdownLabel}>days</Text>
                      </View>
                      <View style={styles.cardCopy}>
                        <Text style={styles.goalTitle} numberOfLines={2}>{goal.title}</Text>
                        <Text style={styles.goalMeta}>{'目标日 '} {goal.targetDate}</Text>
                        <View style={styles.statusLine}>
                          <ThemedChip label={todayCheckIn ? `今日${statusText[todayCheckIn.status]}` : '今日未打卡'} tone={todayCheckIn ? 'success' : 'default'} />
                        </View>
                      </View>
                    </View>

                    <View style={styles.statsRow}>
                      <Text style={styles.statText}>{'点亮 '} {completedCount}/{totalDays}</Text>
                      <Text style={styles.statText}>{'部分 '} {partialCount}</Text>
                      <Text style={styles.statText}>{progressPercent}%</Text>
                    </View>

                    <GoalProgressGrid compact goal={goal} checkIns={checkIns} maxItems={48} />
                  </Pressable>

                  <View style={styles.checkInRow}>
                    {checkInOptions.map((option) => (
                      <ThemedChip
                        active={todayCheckIn?.status === option.status}
                        key={option.status}
                        label={option.label}
                        onPress={() => void checkInToday(goal, option.status)}
                        style={styles.checkChip}
                        tone={option.status === 'completed' ? 'success' : option.status === 'partial' ? 'warning' : 'default'}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
    content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.md },
    hero: { overflow: 'hidden', borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.xl, minHeight: 170 },
    heroShape: { position: 'absolute', right: -28, top: -34, width: 132, height: 132, borderRadius: 66, backgroundColor: '#FFB6D2' },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.xs },
    title: { ...typography.display, color: theme.text, fontWeight: '900' },
    subtitle: { ...typography.body, color: theme.textMuted, maxWidth: '78%', marginTop: spacing.xs },
    list: { gap: spacing.md },
    card: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md, gap: spacing.md },
    cardPress: { gap: spacing.md },
    pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
    cardHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    countdownBox: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center', borderRadius: radius.large, backgroundColor: theme.primary },
    countdownValue: { color: theme.textOnPrimary, fontSize: 32, fontWeight: '900', lineHeight: 34 },
    countdownLabel: { ...typography.micro, color: theme.textOnPrimary, opacity: 0.84 },
    cardCopy: { flex: 1, minWidth: 0 },
    goalTitle: { ...typography.section, color: theme.text, fontWeight: '900' },
    goalMeta: { ...typography.caption, color: theme.textMuted, marginTop: spacing.xxs },
    statusLine: { flexDirection: 'row', marginTop: spacing.sm },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    statText: { ...typography.caption, color: theme.primary, backgroundColor: theme.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontWeight: '900' },
    checkInRow: { flexDirection: 'row', gap: spacing.xs },
    checkChip: { flex: 1 },
  });
}
