import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/theme';
import { getTaskDates, getTasksByDate } from '@/storage/taskRepository';
import type { ISODateString, Task } from '@/types';
import { formatChineseDate } from '@/utils/date';
import { formatFocusDuration, getTaskFocusSeconds } from '@/utils/time';

type HistorySummary = {
  date: ISODateString;
  tasks: Task[];
};

export default function HistoryScreen() {
  const [summaries, setSummaries] = useState<HistorySummary[]>([]);

  const loadHistory = useCallback(async () => {
    const dates = await getTaskDates();
    const nextSummaries = await Promise.all(
      dates.map(async (date) => ({
        date,
        tasks: await getTasksByDate(date),
      })),
    );
    setSummaries(nextSummaries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>历史记录</Text>
        <Text style={styles.description}>
          第一阶段先展示按日期聚合的任务概览。后续会补上评分、总结和还愿照片墙。
        </Text>

        {summaries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>还没有历史</Text>
            <Text style={styles.emptyText}>添加今日任务后，这里会出现每天的记录。</Text>
          </View>
        ) : (
          summaries.map((summary) => {
            const completedCount = summary.tasks.filter((task) => task.status === 'completed').length;
            const focusSeconds = summary.tasks.reduce((sum, task) => sum + getTaskFocusSeconds(task), 0);

            return (
              <View key={summary.date} style={styles.record}>
                <Text style={styles.recordDate}>{formatChineseDate(summary.date)}</Text>
                <Text style={styles.recordText}>
                  完成 {completedCount}/{summary.tasks.length} · 专注 {formatFocusDuration(focusSeconds)}
                </Text>
              </View>
            );
          })
        )}

        <Link href="/" asChild>
          <PrimaryButton variant="soft">回到今日</PrimaryButton>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginBottom: 8,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  empty: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginBottom: 18,
    padding: 24,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  record: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    marginBottom: 12,
    padding: 16,
  },
  recordDate: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  recordText: {
    color: colors.muted,
    fontSize: 15,
  },
});
