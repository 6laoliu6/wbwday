import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedChip } from '@/components/ThemedChip';
import { completionStatusLabels, importanceNames, statusLabels } from '@/constants/taskText';
import { getFocusSessionsByTaskId } from '@/storage/focusRepository';
import { getLatestCompletionProofByTaskId } from '@/storage/proofRepository';
import { getTaskById, updateTask } from '@/storage/taskRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { CompletionProof, FocusSession, Task } from '@/types';
import { formatFullChineseDate } from '@/utils/date';
import { hapticLight, hapticSelection, hapticSuccess } from '@/utils/haptics';
import { formatClockTime, formatFocusDuration, getTaskFocusSeconds } from '@/utils/time';

const focusModeLabels: Record<FocusSession['mode'], string> = {
  normal: '普通计时',
  pomodoro: '番茄钟',
};

export default function TaskDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task | undefined>();
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [completionProof, setCompletionProof] = useState<CompletionProof | undefined>();
  const [loading, setLoading] = useState(true);

  const loadTask = useCallback(async () => {
    if (!params.id) { setLoading(false); return; }
    const [nextTask, nextFocusSessions, nextProof] = await Promise.all([getTaskById(params.id), getFocusSessionsByTaskId(params.id), getLatestCompletionProofByTaskId(params.id)]);
    setTask(nextTask);
    setFocusSessions(nextFocusSessions);
    setCompletionProof(nextProof);
    setLoading(false);
  }, [params.id]);

  useFocusEffect(useCallback(() => { void loadTask(); }, [loadTask]));

  const markComplete = useCallback(async () => {
    if (!task) return;
    const updated = await updateTask(task.id, { status: 'completed', completionStatus: 'completed', completedAt: new Date().toISOString() });
    void hapticSuccess();
    setTask(updated);
  }, [task]);

  const markPartial = useCallback(async () => {
    if (!task) return;
    const updated = await updateTask(task.id, { status: 'partial', completionStatus: 'partial', completedAt: new Date().toISOString() });
    void hapticSelection();
    setTask(updated);
  }, [task]);

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>;

  if (!task) {
    return <SafeAreaView style={styles.screen}><View style={styles.empty}><Text style={styles.emptyTitle}>{'没有找到这个任务'}</Text><PrimaryButton onPress={() => router.replace('/')} variant="soft">{'返回今日首页'}</PrimaryButton></View></SafeAreaView>;
  }

  const proofUri = completionProof?.thumbnailUri ?? completionProof?.imageUri;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroShape} />
          <Text style={styles.date}>{formatFullChineseDate(task.date)}</Text>
          <Text style={styles.title}>{task.title}</Text>
          <View style={styles.statusRow}>
            <ThemedChip label={statusLabels[task.status]} tone={task.status === 'completed' ? 'success' : task.status === 'partial' ? 'warning' : task.status === 'in_progress' ? 'primary' : 'default'} />
            <ThemedChip label={importanceNames[task.importance]} tone="primary" />
            {task.isTopThree ? <ThemedChip label="今日三件大事" tone="accent" /> : null}
          </View>
        </View>

        <View style={styles.primaryActions}>
          <PrimaryButton onPress={() => { void hapticLight(); router.push(`/focus/${task.id}` as Href); }} size="large">{'开始专注'}</PrimaryButton>
          <PrimaryButton onPress={() => router.push(`/proof/${task.id}` as Href)} size="large" variant="soft">{'完成并还愿'}</PrimaryButton>
        </View>

        <View style={styles.secondaryActions}>
          <PrimaryButton onPress={markComplete} variant="soft">{'仅标记完成'}</PrimaryButton>
          <PrimaryButton onPress={markPartial} variant="quiet">{'标记部分完成'}</PrimaryButton>
        </View>
        {task.completionCriteria ? <View style={styles.block}><Text style={styles.label}>????</Text><Text style={styles.body}>{task.completionCriteria}</Text></View> : null}

        <View style={styles.grid}>
          <InfoItem label="预计时间" theme={theme} value={`${task.estimatedMinutes} 分钟`} />
          <InfoItem label="累计专注" theme={theme} value={formatFocusDuration(getTaskFocusSeconds(task))} />
        </View>

        <View style={styles.block}><Text style={styles.label}>{'备注'}</Text><Text style={styles.body}>{task.note.trim().length > 0 ? task.note : '暂无备注'}</Text></View>

        <View style={styles.block}>
          <Text style={styles.label}>{'专注记录'}</Text>
          {focusSessions.length === 0 ? <Text style={styles.mutedBody}>{'还没有专注记录。'}</Text> : focusSessions.map((session) => (
            <View key={session.id} style={styles.sessionRow}>
              <View style={styles.sessionCopy}>
                <Text style={styles.sessionTitle}>{focusModeLabels[session.mode]}</Text>
                <Text style={styles.sessionMeta}>{formatClockTime(session.startedAt)} {'开始 ? '} {session.completed ? '已完成' : '提前结束'}</Text>
              </View>
              <Text style={styles.sessionDuration}>{formatFocusDuration(session.durationSeconds)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>{'还愿记录'}</Text>
          {completionProof ? (
            <View>
              {proofUri ? <View style={styles.proofFrame}><Image source={{ uri: proofUri }} style={styles.proofImage} /><View style={styles.proofBadge}><Text style={styles.proofBadgeText}>{completionStatusLabels[completionProof.completionStatus]}</Text></View></View> : null}
              <Text style={styles.body}>{'实际完成：'}{completionProof.actualResult?.trim() || '未填写'}</Text>
              <Text style={styles.body}>{'完成感想：'}{completionProof.note?.trim() || '未填写'}</Text>
              <Text style={styles.mutedBody}>{'保存时间：'}{formatClockTime(completionProof.createdAt)}</Text>
              <View style={styles.proofAction}><PrimaryButton onPress={() => router.push(`/proof/${task.id}` as Href)} variant="soft">{'修改还愿'}</PrimaryButton></View>
            </View>
          ) : (
            <View><Text style={styles.mutedBody}>{'还没有还愿记录。'}</Text><View style={styles.proofAction}><PrimaryButton onPress={() => router.push(`/proof/${task.id}` as Href)} variant="soft">{'完成并还愿'}</PrimaryButton></View></View>
          )}
        </View>

        <PrimaryButton onPress={() => router.back()} variant="soft">{'返回'}</PrimaryButton>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoItem({ label, theme, value }: { label: string; theme: AppTheme; value: string }) {
  return <View style={{ flex: 1, minWidth: 140, borderColor: theme.border, borderRadius: radius.large, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md }}><Text style={{ ...typography.caption, color: theme.textMuted, fontWeight: '900', marginBottom: spacing.xs }}>{label}</Text><Text style={{ ...typography.cardTitle, color: theme.primary, fontWeight: '900' }}>{value}</Text></View>;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    hero: { overflow: 'hidden', borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, marginBottom: spacing.md, padding: spacing.xl },
    heroShape: { position: 'absolute', right: -34, top: -26, width: 128, height: 96, borderRadius: radius.xlarge, backgroundColor: theme.accent, transform: [{ rotate: '-12deg' }] },
    date: { ...typography.caption, color: theme.primary, fontWeight: '900', marginBottom: spacing.sm },
    title: { ...typography.title, color: theme.text, fontWeight: '900', lineHeight: 36, marginBottom: spacing.md, maxWidth: '86%' },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    primaryActions: { gap: spacing.sm, marginBottom: spacing.sm },
    secondaryActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    block: { borderColor: theme.border, borderRadius: radius.large, borderWidth: 1, backgroundColor: theme.surface, marginBottom: spacing.md, padding: spacing.md },
    label: { ...typography.body, color: theme.text, fontWeight: '900', marginBottom: spacing.sm },
    body: { ...typography.body, color: theme.text, lineHeight: 23, marginBottom: spacing.xs },
    mutedBody: { ...typography.body, color: theme.textMuted, lineHeight: 22 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    sessionRow: { alignItems: 'center', borderTopColor: theme.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
    sessionCopy: { flex: 1, paddingRight: spacing.sm },
    sessionTitle: { ...typography.body, color: theme.text, fontWeight: '900', marginBottom: spacing.xxs },
    sessionMeta: { ...typography.caption, color: theme.textMuted },
    sessionDuration: { ...typography.caption, color: theme.primary, fontWeight: '900' },
    proofFrame: { overflow: 'hidden', borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surfaceAlt, marginBottom: spacing.md },
    proofImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: theme.surfaceAlt },
    proofBadge: { position: 'absolute', left: spacing.md, top: spacing.md, borderRadius: radius.pill, backgroundColor: theme.accent, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    proofBadgeText: { ...typography.caption, color: theme.text, fontWeight: '900' },
    proofAction: { marginTop: spacing.md },
    empty: { flex: 1, justifyContent: 'center', padding: spacing.lg },
    emptyTitle: { ...typography.section, color: theme.text, fontWeight: '900', marginBottom: spacing.md, textAlign: 'center' },
  });
}
