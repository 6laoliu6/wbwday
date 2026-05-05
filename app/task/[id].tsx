import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/theme';
import { completionStatusLabels, importanceNames, statusLabels } from '@/constants/taskText';
import { getFocusSessionsByTaskId } from '@/storage/focusRepository';
import { getLatestCompletionProofByTaskId } from '@/storage/proofRepository';
import { getTaskById, updateTask } from '@/storage/taskRepository';
import type { CompletionProof, FocusSession, Task } from '@/types';
import { formatFullChineseDate } from '@/utils/date';
import { formatClockTime, formatFocusDuration, getTaskFocusSeconds } from '@/utils/time';

const focusModeLabels: Record<FocusSession['mode'], string> = {
  normal: '普通计时',
  pomodoro: '番茄钟',
};

export default function TaskDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task | undefined>();
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [completionProof, setCompletionProof] = useState<CompletionProof | undefined>();
  const [loading, setLoading] = useState(true);

  const loadTask = useCallback(async () => {
    if (!params.id) {
      setLoading(false);
      return;
    }

    const [nextTask, nextFocusSessions, nextProof] = await Promise.all([
      getTaskById(params.id),
      getFocusSessionsByTaskId(params.id),
      getLatestCompletionProofByTaskId(params.id),
    ]);

    setTask(nextTask);
    setFocusSessions(nextFocusSessions);
    setCompletionProof(nextProof);
    setLoading(false);
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      void loadTask();
    }, [loadTask]),
  );

  const markComplete = useCallback(async () => {
    if (!task) {
      return;
    }

    const updated = await updateTask(task.id, {
      status: 'completed',
      completionStatus: 'completed',
      completedAt: new Date().toISOString(),
    });
    setTask(updated);
  }, [task]);

  const markPartial = useCallback(async () => {
    if (!task) {
      return;
    }

    const updated = await updateTask(task.id, {
      status: 'partial',
      completionStatus: 'partial',
      completedAt: new Date().toISOString(),
    });
    setTask(updated);
  }, [task]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>没有找到这个任务</Text>
          <PrimaryButton onPress={() => router.replace('/')} variant="soft">
            返回今日首页
          </PrimaryButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{formatFullChineseDate(task.date)}</Text>
        <Text style={styles.title}>{task.title}</Text>

        <View style={styles.buttonRow}>
          <PrimaryButton onPress={() => router.push(`/focus/${task.id}` as Href)}>开始专注</PrimaryButton>
          <PrimaryButton onPress={() => router.push(`/proof/${task.id}` as Href)} variant="soft">
            完成并还愿
          </PrimaryButton>
        </View>

        <View style={styles.buttonRow}>
          <PrimaryButton onPress={markComplete} variant="soft">
            仅标记完成
          </PrimaryButton>
          <PrimaryButton onPress={markPartial} variant="ghost">
            标记部分完成
          </PrimaryButton>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>完成标准</Text>
          <Text style={styles.body}>{task.completionCriteria}</Text>
        </View>

        <View style={styles.grid}>
          <InfoItem label="重要程度" value={importanceNames[task.importance]} />
          <InfoItem label="预计时间" value={`${task.estimatedMinutes} 分钟`} />
          <InfoItem label="当前状态" value={statusLabels[task.status]} />
          <InfoItem label="累计专注" value={formatFocusDuration(getTaskFocusSeconds(task))} />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>今日三件大事</Text>
          <Text style={styles.body}>{task.isTopThree ? '是' : '否'}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>备注</Text>
          <Text style={styles.body}>{task.note.trim().length > 0 ? task.note : '暂无备注'}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>专注记录</Text>
          {focusSessions.length === 0 ? (
            <Text style={styles.mutedBody}>还没有专注记录。</Text>
          ) : (
            focusSessions.map((session) => (
              <View key={session.id} style={styles.sessionRow}>
                <View>
                  <Text style={styles.sessionTitle}>{focusModeLabels[session.mode]}</Text>
                  <Text style={styles.sessionMeta}>
                    {formatClockTime(session.startedAt)} 开始 · {session.completed ? '已完成' : '提前结束'}
                  </Text>
                </View>
                <Text style={styles.sessionDuration}>{formatFocusDuration(session.durationSeconds)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>还愿记录</Text>
          {completionProof ? (
            <View>
              {completionProof.thumbnailUri ?? completionProof.imageUri ? (
                <Image
                  source={{ uri: completionProof.thumbnailUri ?? completionProof.imageUri }}
                  style={styles.proofImage}
                />
              ) : null}
              <Text style={styles.body}>
                完成状态：{completionStatusLabels[completionProof.completionStatus]}
              </Text>
              <Text style={styles.body}>
                实际完成：{completionProof.actualResult?.trim() || '未填写'}
              </Text>
              <Text style={styles.body}>完成感想：{completionProof.note?.trim() || '未填写'}</Text>
              <Text style={styles.mutedBody}>保存时间：{formatClockTime(completionProof.createdAt)}</Text>
              <View style={styles.proofAction}>
                <PrimaryButton onPress={() => router.push(`/proof/${task.id}` as Href)} variant="soft">
                  修改还愿
                </PrimaryButton>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.mutedBody}>还没有还愿记录。</Text>
              <View style={styles.proofAction}>
                <PrimaryButton onPress={() => router.push(`/proof/${task.id}` as Href)} variant="soft">
                  完成并还愿
                </PrimaryButton>
              </View>
            </View>
          )}
        </View>

        <PrimaryButton onPress={() => router.back()} variant="soft">
          返回
        </PrimaryButton>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  date: {
    color: colors.accentDark,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 34,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  block: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    marginBottom: 14,
    padding: 16,
  },
  label: {
    color: colors.accentDark,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  body: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
  },
  mutedBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  infoItem: {
    width: '48%',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: 14,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  infoValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  sessionRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sessionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  sessionMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  sessionDuration: {
    color: colors.accentDark,
    fontSize: 14,
    fontWeight: '900',
  },
  proofImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    marginBottom: 12,
  },
  proofAction: {
    marginTop: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
});
