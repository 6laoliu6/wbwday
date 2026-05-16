import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ProofPhotoWall } from '@/components/ProofPhotoWall';
import { RatingSelector } from '@/components/RatingSelector';
import { ReviewTaskItem } from '@/components/ReviewTaskItem';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { getFocusSessionsByDate } from '@/storage/focusRepository';
import { getCompletionProofsByDate } from '@/storage/proofRepository';
import { getReviewByDate, updateReview } from '@/storage/reviewRepository';
import { getTasksByDate, moveTaskToTomorrow, updateTask } from '@/storage/taskRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { CompletionProof, DailyReview, FocusSession, ISODateString, Task } from '@/types';
import { formatFullChineseDate } from '@/utils/date';
import { hapticError, hapticSelection, hapticSuccess } from '@/utils/haptics';
import { buildReviewStats } from '@/utils/reviewStats';
import { formatFocusDuration } from '@/utils/time';

export default function ReviewByDateScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ date: ISODateString }>();
  const date = params.date;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [proofs, setProofs] = useState<CompletionProof[]>([]);
  const [review, setReview] = useState<DailyReview | undefined>();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | undefined>();
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movedTaskIds, setMovedTaskIds] = useState<string[]>([]);

  const loadReview = useCallback(async () => {
    if (!date) { setLoading(false); return; }
    const [nextTasks, nextFocusSessions, nextProofs, nextReview] = await Promise.all([getTasksByDate(date), getFocusSessionsByDate(date), getCompletionProofsByDate(date), getReviewByDate(date)]);
    setTasks(nextTasks);
    setFocusSessions(nextFocusSessions);
    setProofs(nextProofs);
    setReview(nextReview);
    setRating(nextReview?.rating);
    setSummary(nextReview?.summary ?? '');
    setMovedTaskIds(nextReview?.unfinishedTaskIdsMovedToTomorrow ?? []);
    setLoading(false);
  }, [date]);

  useFocusEffect(useCallback(() => { void loadReview(); }, [loadReview]));

  const stats = useMemo(() => buildReviewStats(tasks, focusSessions, proofs), [focusSessions, proofs, tasks]);

  const saveDailyReview = useCallback(async () => {
    if (!date || saving) return;
    setSaving(true);
    try {
      const nextReview = await updateReview(date, { rating, summary, unfinishedTaskIdsMovedToTomorrow: movedTaskIds });
      setReview(nextReview);
      void hapticSuccess();
      Alert.alert('今日复盘已保存。');
    } catch {
      void hapticError();
      Alert.alert('保存失败', '今日复盘没有保存成功，请稍后再试。');
    } finally {
      setSaving(false);
    }
  }, [date, movedTaskIds, rating, saving, summary]);

  const moveToTomorrow = useCallback(async (task: Task) => {
    if (!date || movedTaskIds.includes(task.id)) return;
    await moveTaskToTomorrow(task.id);
    const nextMovedIds = [...movedTaskIds, task.id];
    setMovedTaskIds(nextMovedIds);
    await updateReview(date, { unfinishedTaskIdsMovedToTomorrow: nextMovedIds });
    void hapticSuccess();
    Alert.alert('已移到明天。');
  }, [date, movedTaskIds]);

  const markPartial = useCallback(async (task: Task) => {
    const updated = await updateTask(task.id, { status: 'partial', completionStatus: 'partial', completedAt: new Date().toISOString() });
    setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    void hapticSelection();
  }, []);

  const selectRating = useCallback((nextRating: 1 | 2 | 3 | 4 | 5) => { setRating(nextRating); void hapticSelection(); }, []);

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>;

  if (!date) {
    return <SafeAreaView style={styles.screen}><View style={styles.empty}><Text style={styles.emptyTitle}>{'没有找到这一天的复盘。'}</Text><PrimaryButton onPress={() => router.replace('/')} variant="soft">{'返回今日首页'}</PrimaryButton></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroCircle} />
          <Text style={styles.kicker}>{'给今天一个收尾'}</Text>
          <Text style={styles.title}>{'今晚复盘'}</Text>
          <Text style={styles.subtitle}>{'今天也有认真生活。看看兑现了哪些承诺。'}</Text>
          <Text style={styles.date}>{formatFullChineseDate(date)}</Text>
        </View>

        <View style={styles.overview}>
          {stats.totalCount === 0 ? <Text style={styles.overviewMainSmall}>{'今天还没有立愿记录。'}</Text> : (
            <>
              <Text style={styles.overviewEyebrow}>TODAY</Text>
              <Text style={styles.overviewMain}>{stats.completedCount} / {stats.totalCount}</Text>
              <Text style={styles.overviewText}>{'件事被兑现'}</Text>
              <View style={styles.overviewMetaRow}>
                <Text style={styles.overviewMeta}>{'专注 '} {formatFocusDuration(stats.totalFocusSeconds)}</Text>
                <Text style={styles.overviewMeta}>{'还愿照片 '} {stats.proofPhotos.length} {'张'}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.statsGrid}>
          <StatItem label="完成率" theme={theme} value={`${stats.completionRate}%`} />
          <StatItem label="部分完成" theme={theme} value={String(stats.partialCount)} />
          <StatItem label="未完成" theme={theme} value={String(stats.unfinishedCount)} />
        </View>

        <Section title="今日还愿照片墙" theme={theme}><ProofPhotoWall proofs={stats.proofPhotos} /></Section>

        <Section title="完成任务" theme={theme}>
          {stats.completedTasks.length === 0 ? <Text style={styles.mutedText}>{'今天还没有完全完成的任务。'}</Text> : stats.completedTasks.map(({ task, proof }) => <ReviewTaskItem key={task.id} onPress={() => router.push(`/task/${task.id}` as Href)} proof={proof} task={task} />)}
        </Section>

        <Section title="部分完成" theme={theme}>
          {stats.partialTasks.length === 0 ? <Text style={styles.mutedText}>{'没有部分完成的任务。'}</Text> : stats.partialTasks.map(({ task, proof }) => <ReviewTaskItem key={task.id} onPress={() => router.push(`/task/${task.id}` as Href)} proof={proof} task={task} />)}
        </Section>

        <Section title="明天可以继续" theme={theme}>
          {stats.unfinishedTasks.length === 0 ? <Text style={styles.mutedText}>{'没有未完成任务。今天收得很干净。'}</Text> : (
            <>
              <Text style={styles.softNote}>{'没完成也没关系，明天继续。'}</Text>
              {stats.unfinishedTasks.map(({ task, proof }) => (
                <View key={task.id}>
                  {movedTaskIds.includes(task.id) ? <Text style={styles.movedText}>{'已移到明天'}</Text> : null}
                  <ReviewTaskItem onMarkPartial={() => markPartial(task)} onMoveToTomorrow={() => moveToTomorrow(task)} onPress={() => router.push(`/task/${task.id}` as Href)} onSkip={() => Alert.alert('暂不处理', '没完成也没关系，明天可以继续。')} proof={proof} showUnfinishedActions={!movedTaskIds.includes(task.id)} task={task} />
                </View>
              ))}
            </>
          )}
        </Section>

        <Section title="今日评分" theme={theme}><RatingSelector onChange={selectRating} value={rating} /></Section>

        <Section title="今日总结" theme={theme}>
          <TextInput multiline onChangeText={setSummary} placeholder="写一句给今天的自己。" placeholderTextColor={theme.textMuted} selectionColor={theme.primary} style={styles.summaryInput} textAlignVertical="top" value={summary} />
          <View style={styles.summaryVoice}>
            <VoiceInputButton
              label="语音写总结"
              onTranscript={(text) => setSummary((current) => (current.trim() ? `${current.trim()}\n${text}` : text))}
            />
          </View>
        </Section>

        <PrimaryButton disabled={saving} onPress={saveDailyReview} size="large">{saving ? '保存中' : review ? '更新今日复盘' : '保存今日复盘'}</PrimaryButton>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ children, theme, title }: { children: ReactNode; theme: AppTheme; title: string }) {
  return <View style={{ borderColor: theme.border, borderRadius: radius.large, borderWidth: 1, backgroundColor: theme.surface, marginBottom: spacing.md, padding: spacing.md }}><Text style={{ ...typography.cardTitle, color: theme.text, fontWeight: '900', marginBottom: spacing.sm }}>{title}</Text>{children}</View>;
}

function StatItem({ label, theme, value }: { label: string; theme: AppTheme; value: string }) {
  return <View style={{ flex: 1, minWidth: 96, borderColor: theme.border, borderRadius: radius.large, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md }}><Text style={{ ...typography.section, color: theme.primary, fontWeight: '900' }}>{value}</Text><Text style={{ ...typography.caption, color: theme.textMuted, fontWeight: '900', marginTop: spacing.xs }}>{label}</Text></View>;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    hero: { overflow: 'hidden', borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, marginBottom: spacing.md, padding: spacing.xl },
    heroCircle: { position: 'absolute', right: -34, top: -38, width: 126, height: 126, borderRadius: 63, backgroundColor: theme.accent, opacity: 0.76 },
    kicker: { ...typography.caption, color: theme.primary, fontWeight: '900', marginBottom: spacing.xs },
    title: { ...typography.title, color: theme.text, fontWeight: '900', marginBottom: spacing.xs },
    subtitle: { ...typography.body, color: theme.textMuted, lineHeight: 22, maxWidth: '82%' },
    date: { ...typography.caption, alignSelf: 'flex-start', borderRadius: radius.pill, backgroundColor: theme.surfaceAlt, color: theme.primary, fontWeight: '900', marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
    overview: { overflow: 'hidden', borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, marginBottom: spacing.md, padding: spacing.xl },
    overviewEyebrow: { ...typography.micro, color: theme.textMuted, fontWeight: '900', marginBottom: spacing.xs },
    overviewMain: { color: theme.primary, fontSize: 54, fontWeight: '900', lineHeight: 58 },
    overviewMainSmall: { ...typography.section, color: theme.text, fontWeight: '900' },
    overviewText: { ...typography.body, color: theme.text, fontWeight: '900', marginTop: spacing.xs },
    overviewMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    overviewMeta: { ...typography.caption, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: theme.accent, color: theme.text, fontWeight: '900', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    mutedText: { ...typography.body, color: theme.textMuted, lineHeight: 22 },
    softNote: { ...typography.caption, color: theme.textMuted, fontWeight: '800', marginBottom: spacing.sm },
    movedText: { alignSelf: 'flex-start', borderRadius: radius.pill, backgroundColor: theme.surfaceAlt, color: theme.success, fontSize: 12, fontWeight: '900', marginBottom: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    summaryInput: { minHeight: 124, borderColor: theme.border, borderRadius: radius.large, borderWidth: 1, backgroundColor: theme.surfaceAlt, color: theme.text, fontSize: 16, lineHeight: 24, padding: spacing.md },
    summaryVoice: { marginTop: spacing.sm },
    empty: { flex: 1, justifyContent: 'center', padding: spacing.lg },
    emptyTitle: { ...typography.section, color: theme.text, fontWeight: '900', marginBottom: spacing.md, textAlign: 'center' },
  });
}
