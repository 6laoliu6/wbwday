import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';

import { GoalProgressGrid } from '@/components/GoalProgressGrid';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TaskCard } from '@/components/TaskCard';
import {
  getActiveGoals,
  getCheckInByGoalIdAndDate,
  getCheckInsByGoalId,
} from '@/storage/goalRepository';
import {
  MAX_TOP_THREE_TASKS,
  deleteTask,
  getTodayTasks,
  saveTaskOrder,
  updateTask,
} from '@/storage/taskRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { Goal, GoalCheckIn, Task, TaskStatus } from '@/types';
import { formatEditorialDate, toDateKey } from '@/utils/date';
import { getDaysUntilTarget, getGoalProgressPercent } from '@/utils/goalStats';
import {
  hapticLight,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
} from '@/utils/haptics';
import { getTaskFocusSeconds } from '@/utils/time';

function isTopThreeLimitError(error: unknown): boolean {
  return error instanceof Error && error.message === 'TOP_THREE_LIMIT_REACHED';
}

function formatHomeFocus(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0 ? `${hours}h ${restMinutes}m` : `${hours}h`;
}

export default function TodayScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [featuredGoal, setFeaturedGoal] = useState<Goal | undefined>();
  const [featuredGoalCheckIns, setFeaturedGoalCheckIns] = useState<GoalCheckIn[]>([]);
  const [featuredGoalTodayCheckIn, setFeaturedGoalTodayCheckIn] = useState<GoalCheckIn | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = toDateKey();

  const loadHome = useCallback(async () => {
    try {
      const [nextTasks, activeGoals] = await Promise.all([getTodayTasks(), getActiveGoals()]);
      const nextGoal = [...activeGoals].sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];

      setTasks(nextTasks);
      setFeaturedGoal(nextGoal);

      if (nextGoal) {
        const [checkIns, todayCheckIn] = await Promise.all([
          getCheckInsByGoalId(nextGoal.id),
          getCheckInByGoalIdAndDate(nextGoal.id, today),
        ]);
        setFeaturedGoalCheckIns(checkIns);
        setFeaturedGoalTodayCheckIn(todayCheckIn);
      } else {
        setFeaturedGoalCheckIns([]);
        setFeaturedGoalTodayCheckIn(undefined);
      }
    } catch {
      Alert.alert('加载失败', '首页数据没有加载成功，请稍后再试。');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [loadHome]),
  );

  const completedCount = useMemo(
    () =>
      tasks.filter(
        (task) => task.status === 'completed' || task.completionStatus === 'exceeded',
      ).length,
    [tasks],
  );

  const totalFocusSeconds = useMemo(
    () => tasks.reduce((sum, task) => sum + getTaskFocusSeconds(task), 0),
    [tasks],
  );

  const progressPercent = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadHome();
    setRefreshing(false);
  }, [loadHome]);

  const changeStatus = useCallback(async (task: Task, status: TaskStatus) => {
    const updated = await updateTask(task.id, {
      status,
      completionStatus:
        status === 'completed' ? 'completed' : status === 'partial' ? 'partial' : undefined,
      completedAt:
        status === 'completed' || status === 'partial' ? new Date().toISOString() : undefined,
    });

    if (status === 'completed') {
      void hapticSuccess();
    }

    setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const toggleTopThree = useCallback(async (task: Task) => {
    if (!task.isTopThree) {
      const currentTopThreeCount = tasks.filter((item) => item.isTopThree).length;

      if (currentTopThreeCount >= MAX_TOP_THREE_TASKS) {
        void hapticWarning();
        Alert.alert('今日三件大事已满', '最多只能设置 3 个任务为今日三件大事。');
        return;
      }
    }

    try {
      const updated = await updateTask(task.id, { isTopThree: !task.isTopThree });
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      if (isTopThreeLimitError(error)) {
        void hapticWarning();
        Alert.alert('今日三件大事已满', '最多只能设置 3 个任务为今日三件大事。');
        return;
      }

      Alert.alert('更新失败', '任务没有更新成功，请稍后再试。');
    }
  }, [tasks]);

  const confirmDelete = useCallback((task: Task) => {
    Alert.alert('删除任务', `确定删除「${task.title}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task.id);
          setTasks((current) => current.filter((item) => item.id !== task.id));
          await loadHome();
        },
      },
    ]);
  }, [loadHome]);

  const saveOrder = useCallback(
    async ({ data }: { data: Task[] }) => {
      setTasks(data);
      const persistedTasks = await saveTaskOrder(
        today,
        data.map((task) => task.id),
      );
      void hapticSelection();
      setTasks(persistedTasks);
    },
    [today],
  );

  const renderTask = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Task>) => (
      <ScaleDecorator>
        <TaskCard
          index={tasks.findIndex((task) => task.id === item.id)}
          isDragging={isActive}
          onDelete={() => confirmDelete(item)}
          onLongPress={drag}
          onPress={() => router.push(`/task/${item.id}` as Href)}
          onStartFocus={() => {
            void hapticLight();
            router.push(`/focus/${item.id}` as Href);
          }}
          onStatusChange={(status) => changeStatus(item, status)}
          onToggleTopThree={() => toggleTopThree(item)}
          task={item}
        />
      </ScaleDecorator>
    ),
    [changeStatus, confirmDelete, tasks, toggleTopThree],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <DraggableFlatList
        activationDistance={12}
        contentContainerStyle={styles.content}
        data={tasks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState />}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={styles.heroText}>
                <Text style={styles.brand}>WBWday</Text>
                <Text style={styles.date}>{formatEditorialDate(today)}</Text>
                <Text style={styles.heading}>{'今天，只完成真正重要的事。'}</Text>
              </View>

              <View style={styles.geometry} pointerEvents="none">
                <View style={styles.blueBlock} />
                <View style={styles.yellowOrb} />
                <View style={styles.blueRail} />
                <View style={styles.tinyDot} />
              </View>
            </View>

            <View style={styles.statusPanel}>
              <View>
                <Text style={styles.metricNumber}>
                  {completedCount}
                  <Text style={styles.metricSlash}> / {tasks.length}</Text>
                </Text>
                <Text style={styles.metricLabel}>{'已完成任务'}</Text>
              </View>
              <View style={styles.focusBlock}>
                <Text style={styles.focusValue}>{formatHomeFocus(totalFocusSeconds)}</Text>
                <Text style={styles.metricLabel}>{'今日专注'}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>

            <PrimaryButton
              onPress={() => {
                void hapticLight();
                router.push('/plan' as Href);
              }}
              size="large"
              style={styles.mainCta}
            >
              {'开始晨间规划'}
            </PrimaryButton>

            <View style={styles.secondaryGrid}>
              <SecondaryEntry label="手动添加" onPress={() => router.push('/task/new' as Href)} />
              <SecondaryEntry label="Goals" onPress={() => router.push('/goals' as Href)} />
              <SecondaryEntry label="??" onPress={() => router.push('/ledger' as Href)} />
              <SecondaryEntry label="??" onPress={() => router.push('/meals' as Href)} />
              <SecondaryEntry label="晚间复盘" onPress={() => router.push('/review' as Href)} />
              <SecondaryEntry label="历史记录" onPress={() => router.push('/history' as Href)} />
              <SecondaryEntry label="主题" onPress={() => router.push('/theme' as Href)} />
            </View>

            {featuredGoal ? (
              <FeaturedGoalCard
                checkIns={featuredGoalCheckIns}
                goal={featuredGoal}
                todayCheckIn={featuredGoalTodayCheckIn}
              />
            ) : null}

            <Text style={styles.whisper}>{'把今天切小一点，把注意力放亮一点。'}</Text>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{'今日任务'}</Text>
              <Text style={styles.sectionHint}>{'长按拖动排序'}</Text>
            </View>
          </View>
        }
        onDragEnd={saveOrder}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} />
        }
        renderItem={renderTask}
      />
    </SafeAreaView>
  );
}

function FeaturedGoalCard({ checkIns, goal, todayCheckIn }: { checkIns: GoalCheckIn[]; goal: Goal; todayCheckIn?: GoalCheckIn }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createFeaturedGoalStyles(theme), [theme]);
  const daysLeft = getDaysUntilTarget(goal.targetDate);
  const progressPercent = getGoalProgressPercent(goal, checkIns);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/goals/${goal.id}` as Href)}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : undefined]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>GOAL TRACK</Text>
          <Text style={styles.title}>{goal.title}</Text>
          <Text style={styles.meta}>{todayCheckIn ? '今日已打卡' : '今日未打卡'}</Text>
        </View>
        <View style={styles.countdown}>
          <Text style={styles.countdownValue}>{daysLeft}</Text>
          <Text style={styles.countdownLabel}>days</Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{progressPercent}%</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progressPercent}%` }]} />
        </View>
      </View>
      <GoalProgressGrid compact goal={goal} checkIns={checkIns} maxItems={28} />
    </Pressable>
  );
}

function SecondaryEntry({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        secondaryStyles.entry,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        pressed ? secondaryStyles.pressed : undefined,
      ]}
    >
      <Text style={[secondaryStyles.label, { color: theme.primary }]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        emptyStyles.empty,
        {
          borderColor: theme.border,
          backgroundColor: theme.surface,
        },
      ]}
    >
      <Text style={[emptyStyles.title, { color: theme.text }]}>{'今天还没有立愿。'}</Text>
      <Text style={[emptyStyles.text, { color: theme.textMuted }]}> 
        {'先写下一件真正重要的事，再给它一个清楚的完成标准。'}
      </Text>
      <View style={emptyStyles.actions}>
        <PrimaryButton
          onPress={() => {
            void hapticLight();
            router.push('/plan' as Href);
          }}
          variant="soft"
        >
          {'晨间规划'}
        </PrimaryButton>
        <PrimaryButton onPress={() => router.push('/task/new' as Href)}>{'手动添加'}</PrimaryButton>
      </View>
    </View>
  );
}

const secondaryStyles = StyleSheet.create({
  entry: {
    minHeight: 44,
    minWidth: '23%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  label: {
    ...typography.caption,
  },
});

const emptyStyles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    borderRadius: radius.large,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: spacing.xl,
  },
  title: {
    ...typography.section,
    marginBottom: spacing.xs,
  },
  text: {
    ...typography.body,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});

function createFeaturedGoalStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderWidth: 1,
      backgroundColor: theme.surface,
      marginTop: spacing.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
    header: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.xxs },
    title: { ...typography.cardTitle, color: theme.text, fontWeight: '900' },
    meta: { ...typography.caption, color: theme.textMuted, marginTop: spacing.xxs },
    countdown: {
      minWidth: 72,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.large,
      backgroundColor: theme.surfaceAlt,
      paddingVertical: spacing.xs,
    },
    countdownValue: { color: theme.primary, fontSize: 28, fontWeight: '900', lineHeight: 30 },
    countdownLabel: { ...typography.micro, color: theme.textMuted, fontWeight: '900' },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    progressText: { ...typography.caption, color: theme.primary, fontWeight: '900', width: 44 },
    track: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: theme.surfaceAlt, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: radius.pill, backgroundColor: '#FF7AAE' },
  });
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.huge,
    },
    hero: {
      minHeight: 310,
      borderRadius: radius.xlarge,
      backgroundColor: theme.surface,
      overflow: 'hidden',
      padding: spacing.xl,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 4,
    },
    heroText: {
      maxWidth: 270,
      zIndex: 2,
    },
    brand: {
      color: theme.primary,
      fontSize: 54,
      fontWeight: '900',
      letterSpacing: 0,
      lineHeight: 58,
    },
    date: {
      ...typography.caption,
      color: theme.textMuted,
      marginTop: spacing.sm,
    },
    heading: {
      ...typography.title,
      color: theme.text,
      marginTop: spacing.xl,
    },
    geometry: {
      bottom: -10,
      height: 230,
      position: 'absolute',
      right: -28,
      width: 230,
    },
    blueBlock: {
      position: 'absolute',
      right: 18,
      top: 24,
      width: 132,
      height: 178,
      borderRadius: radius.large,
      backgroundColor: theme.primary,
      transform: [{ rotate: '10deg' }],
    },
    yellowOrb: {
      position: 'absolute',
      right: 104,
      top: 58,
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor: theme.accent,
    },
    blueRail: {
      position: 'absolute',
      right: 0,
      bottom: 38,
      width: 220,
      height: 42,
      borderRadius: radius.pill,
      backgroundColor: theme.primary,
      opacity: 0.72,
      transform: [{ rotate: '-18deg' }],
    },
    tinyDot: {
      position: 'absolute',
      right: 54,
      top: 0,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.accent,
    },
    statusPanel: {
      borderColor: theme.border,
      borderRadius: radius.large,
      borderWidth: 1,
      backgroundColor: theme.surface,
      marginTop: spacing.lg,
      padding: spacing.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 3,
    },
    metricNumber: {
      color: theme.primary,
      fontSize: 48,
      fontWeight: '900',
      lineHeight: 52,
    },
    metricSlash: {
      color: theme.text,
      fontSize: 28,
    },
    metricLabel: {
      ...typography.caption,
      color: theme.textMuted,
      marginTop: spacing.xs,
    },
    focusBlock: {
      position: 'absolute',
      right: spacing.lg,
      top: spacing.lg,
      alignItems: 'flex-end',
    },
    focusValue: {
      color: theme.text,
      fontSize: 28,
      fontWeight: '900',
      lineHeight: 32,
    },
    progressTrack: {
      height: 12,
      borderRadius: radius.pill,
      backgroundColor: theme.surfaceAlt,
      marginTop: spacing.lg,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: theme.accent,
    },
    mainCta: {
      marginTop: spacing.lg,
    },
    secondaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    whisper: {
      ...typography.caption,
      color: theme.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    sectionHeader: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    sectionTitle: {
      ...typography.section,
      color: theme.text,
    },
    sectionHint: {
      ...typography.caption,
      color: theme.textMuted,
    },
  });
}
