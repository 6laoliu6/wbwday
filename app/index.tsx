import { Link, router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import { AttachmentCard } from '@/components/AttachmentCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TaskCard } from '@/components/TaskCard';
import { mockAttachments } from '@/constants/mockAttachments';
import { colors } from '@/constants/theme';
import {
  deleteTask,
  MAX_TOP_THREE_TASKS,
  getTodayTasks,
  saveTaskOrder,
  updateTask,
} from '@/storage/taskRepository';
import type { Task, TaskStatus } from '@/types';
import { formatFullChineseDate, toDateKey } from '@/utils/date';
import { formatFocusDuration, getTaskFocusSeconds } from '@/utils/time';

function isTopThreeLimitError(error: unknown): boolean {
  return error instanceof Error && error.message === 'TOP_THREE_LIMIT_REACHED';
}

export default function TodayScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = toDateKey();

  const loadTasks = useCallback(async () => {
    const nextTasks = await getTodayTasks();
    setTasks(nextTasks);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTasks();
    }, [loadTasks]),
  );

  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === 'completed').length,
    [tasks],
  );

  const totalFocusSeconds = useMemo(
    () => tasks.reduce((sum, task) => sum + getTaskFocusSeconds(task), 0),
    [tasks],
  );

  const progressPercent = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  const headlineAttachment = mockAttachments.find((attachment) => attachment.id === 'headline');
  const primaryAttachments = mockAttachments.filter((attachment) => attachment.id !== 'headline');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  const changeStatus = useCallback(async (task: Task, status: TaskStatus) => {
    const updated = await updateTask(task.id, {
      status,
      completionStatus:
        status === 'completed' ? 'completed' : status === 'partial' ? 'partial' : undefined,
      completedAt: status === 'completed' || status === 'partial' ? new Date().toISOString() : undefined,
    });
    setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const toggleTopThree = useCallback(async (task: Task) => {
    if (!task.isTopThree) {
      const currentTopThreeCount = tasks.filter((item) => item.isTopThree).length;

      if (currentTopThreeCount >= MAX_TOP_THREE_TASKS) {
        Alert.alert('今日三件大事已满', '最多只能设置 3 个任务为今日三件大事。');
        return;
      }
    }

    try {
      const updated = await updateTask(task.id, { isTopThree: !task.isTopThree });
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      if (isTopThreeLimitError(error)) {
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
          await loadTasks();
        },
      },
    ]);
  }, [loadTasks]);

  const saveOrder = useCallback(
    async ({ data }: { data: Task[] }) => {
      setTasks(data);
      const persistedTasks = await saveTaskOrder(
        today,
        data.map((task) => task.id),
      );
      setTasks(persistedTasks);
    },
    [today],
  );

  const renderTask = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Task>) => (
      <ScaleDecorator>
        <TaskCard
          isDragging={isActive}
          onDelete={() => confirmDelete(item)}
          onLongPress={drag}
          onPress={() => router.push(`/task/${item.id}` as Href)}
          onStatusChange={(status) => changeStatus(item, status)}
          onToggleTopThree={() => toggleTopThree(item)}
          task={item}
        />
      </ScaleDecorator>
    ),
    [changeStatus, confirmDelete, toggleTopThree],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.accent} />
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
              <Text style={styles.date}>{formatFullChineseDate(today)}</Text>
              <Text style={styles.heading}>今天，把愿望落到手上。</Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {completedCount} / {tasks.length}
                  </Text>
                  <Text style={styles.statLabel}>已完成</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatFocusDuration(totalFocusSeconds)}</Text>
                  <Text style={styles.statLabel}>今日专注</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>

            <View style={styles.actions}>
              <Link href="/task/new" asChild>
                <PrimaryButton>手动添加任务</PrimaryButton>
              </Link>
              <Link href={'/plan' as Href} asChild>
                <PrimaryButton variant="soft">晨间规划</PrimaryButton>
              </Link>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attachmentList}
            >
              {primaryAttachments.map((attachment) => (
                <AttachmentCard
                  content={attachment.content}
                  key={attachment.id}
                  title={attachment.title}
                />
              ))}
            </ScrollView>

            {headlineAttachment ? (
              <View style={styles.headlineWrap}>
                <AttachmentCard
                  content={headlineAttachment.content}
                  muted
                  title={headlineAttachment.title}
                />
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>今日任务</Text>
              <Text style={styles.sectionHint}>长按卡片拖动排序</Text>
            </View>
          </View>
        }
        onDragEnd={saveOrder}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={renderTask}
      />
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>今天还没有立愿。</Text>
      <Text style={styles.emptyText}>先写下一件真正想完成的事，再给它一个清楚的完成标准。</Text>
      <View style={styles.emptyActions}>
        <Link href={'/plan' as Href} asChild>
          <PrimaryButton variant="soft">晨间规划</PrimaryButton>
        </Link>
        <Link href="/task/new" asChild>
          <PrimaryButton>手动添加任务</PrimaryButton>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 44,
  },
  hero: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 20,
  },
  date: {
    color: colors.accentDark,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  heading: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 34,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  statItem: {
    flex: 1,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background,
    padding: 12,
  },
  statValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  attachmentList: {
    gap: 12,
    paddingTop: 18,
    paddingBottom: 10,
  },
  headlineWrap: {
    marginBottom: 18,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: 24,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyActions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
});
