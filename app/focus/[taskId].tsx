import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { addFocusSession } from '@/storage/focusRepository';
import { addFocusSecondsToTask, getTaskById } from '@/storage/taskRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { FocusMode, Task } from '@/types';
import { hapticError, hapticLight, hapticSelection, hapticSuccess, hapticWarning } from '@/utils/haptics';
import { formatTimer } from '@/utils/time';

const POMODORO_SECONDS = 25 * 60;
const MIN_SAVE_SECONDS = 5;

type TimerStatus = 'idle' | 'running' | 'paused';

const focusModeLabels: Record<FocusMode, string> = {
  normal: '普通计时',
  pomodoro: '番茄钟 25 分钟',
};

export default function FocusScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = params.taskId;
  const [task, setTask] = useState<Task | undefined>();
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<FocusMode>('normal');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const pomodoroCompletedRef = useRef(false);

  const loadTask = useCallback(async () => {
    if (!taskId) { setLoading(false); return; }
    const nextTask = await getTaskById(taskId);
    setTask(nextTask);
    setLoading(false);
  }, [taskId]);

  useFocusEffect(useCallback(() => { void loadTask(); }, [loadTask]));

  useEffect(() => {
    if (status !== 'running') return undefined;
    const intervalId = setInterval(() => {
      setElapsedSeconds((current) => {
        const next = current + 1;
        return mode === 'pomodoro' ? Math.min(next, POMODORO_SECONDS) : next;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [mode, status]);

  const displayedSeconds = useMemo(() => (mode === 'pomodoro' ? Math.max(0, POMODORO_SECONDS - elapsedSeconds) : elapsedSeconds), [elapsedSeconds, mode]);
  const progress = useMemo(() => mode === 'pomodoro' ? Math.min(1, elapsedSeconds / POMODORO_SECONDS) : Math.min(1, elapsedSeconds / (60 * 60)), [elapsedSeconds, mode]);

  const saveSession = useCallback(async (durationSeconds: number, completed: boolean) => {
    if (!taskId || saving) return;
    const safeDuration = Math.max(0, Math.floor(durationSeconds));
    const startedAtValue = startedAt ?? new Date().toISOString();
    const endedAt = new Date().toISOString();
    setSaving(true);

    try {
      await addFocusSession(taskId, { mode, startedAt: startedAtValue, endedAt, durationSeconds: safeDuration, completed });
      await addFocusSecondsToTask(taskId, safeDuration);
      void hapticSuccess();
      Alert.alert('专注已保存', '本次专注已经记录到任务里。', [
        { text: '好', onPress: () => router.replace(`/task/${taskId}` as Href) },
      ]);
    } catch {
      void hapticError();
      Alert.alert('保存失败', '专注记录没有保存成功，请稍后再试。');
      setSaving(false);
    }
  }, [mode, saving, startedAt, taskId]);

  useEffect(() => {
    if (mode !== 'pomodoro' || status !== 'running' || elapsedSeconds < POMODORO_SECONDS || pomodoroCompletedRef.current) return;
    pomodoroCompletedRef.current = true;
    setStatus('paused');
    void hapticSuccess();
    Alert.alert('本轮番茄钟完成', '已经完成 25 分钟专注，是否保存本轮记录？', [
      { text: '保存', onPress: () => void saveSession(POMODORO_SECONDS, true) },
    ]);
  }, [elapsedSeconds, mode, saveSession, status]);

  const start = useCallback(() => { if (status !== 'idle') return; void hapticLight(); setStartedAt(new Date().toISOString()); setStatus('running'); }, [status]);
  const pause = useCallback(() => { if (status === 'running') { void hapticSelection(); setStatus('paused'); } }, [status]);
  const resume = useCallback(() => { if (status === 'paused') { void hapticLight(); setStatus('running'); } }, [status]);

  const endFocus = useCallback(() => {
    const durationSeconds = mode === 'pomodoro' ? Math.min(elapsedSeconds, POMODORO_SECONDS) : elapsedSeconds;
    if (durationSeconds < MIN_SAVE_SECONDS) {
      void hapticWarning();
      Alert.alert('本次专注时间太短', '少于 5 秒的专注不会保存。', [
        { text: '继续专注', style: 'cancel' },
        { text: '放弃', style: 'destructive', onPress: () => router.back() },
      ]);
      return;
    }
    setStatus('paused');
    void saveSession(durationSeconds, mode === 'normal' || durationSeconds >= POMODORO_SECONDS);
  }, [elapsedSeconds, mode, saveSession]);

  const abandon = useCallback(() => {
    void hapticWarning();
    Alert.alert('放弃本次专注？', '本次计时不会保存。', [
      { text: '继续专注', style: 'cancel' },
      { text: '放弃', style: 'destructive', onPress: () => router.back() },
    ]);
  }, []);

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>;

  if (!task) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{'没有找到这个任务'}</Text>
          <PrimaryButton onPress={() => router.replace('/')} variant="soft">{'返回今日首页'}</PrimaryButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.geometryOne} />
          <View style={styles.geometryTwo} />
          <Text style={styles.kicker}>FOCUS CHAMBER</Text>
          <Text style={styles.title} numberOfLines={2}>{task.title}</Text>
          {task.completionCriteria ? <Text style={styles.criteria} numberOfLines={2}>?????{task.completionCriteria}</Text> : null}
        </View>

        <View style={styles.timerPanel}>
          <View style={styles.modeRow}>
            {(['normal', 'pomodoro'] as FocusMode[]).map((nextMode) => {
              const isActive = mode === nextMode;
              return (
                <Pressable
                  accessibilityRole="button"
                  disabled={status !== 'idle'}
                  key={nextMode}
                  onPress={() => {
                    setMode(nextMode);
                    void hapticSelection();
                  }}
                  style={({ pressed }) => [styles.modeButton, isActive ? styles.modeButtonActive : undefined, status !== 'idle' ? styles.modeButtonDisabled : undefined, pressed && status === 'idle' ? styles.pressed : undefined]}
                >
                  <Text style={[styles.modeText, isActive ? styles.modeTextActive : undefined]}>{nextMode === 'normal' ? '普通计时' : '番茄钟'}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.timerStage}>
            <Text style={styles.timer}>{formatTimer(displayedSeconds)}</Text>
            <Text style={styles.timerHint}>{mode === 'pomodoro' ? '剩余时间' : '已专注时间'}</Text>
          </View>

          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
          <Text style={styles.modeHint}>{status === 'idle' ? `当前：${focusModeLabels[mode]}` : '专注开始后不切换模式。'}</Text>
        </View>

        <View style={styles.controls}>
          {status === 'idle' ? <PrimaryButton onPress={start} size="large">{'开始专注'}</PrimaryButton> : null}
          {status === 'running' ? <PrimaryButton onPress={pause} size="large" variant="soft">{'暂停'}</PrimaryButton> : null}
          {status === 'paused' ? <PrimaryButton onPress={resume} size="large">{'继续'}</PrimaryButton> : null}
          {status !== 'idle' ? (
            <View style={styles.finishGroup}>
              <PrimaryButton disabled={saving} onPress={endFocus} variant="soft">{'结束并保存'}</PrimaryButton>
              <PrimaryButton disabled={saving} onPress={abandon} variant="quiet">{'放弃本次专注'}</PrimaryButton>
            </View>
          ) : <PrimaryButton onPress={() => router.back()} variant="quiet">{'返回'}</PrimaryButton>}
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
    content: { flex: 1, justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
    hero: { minHeight: 150, overflow: 'hidden', borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.xl },
    geometryOne: { position: 'absolute', right: -42, top: -36, width: 156, height: 156, borderRadius: 78, backgroundColor: theme.accent, opacity: 0.8 },
    geometryTwo: { position: 'absolute', bottom: -34, right: 28, width: 108, height: 72, borderRadius: radius.large, backgroundColor: theme.primary, opacity: 0.16, transform: [{ rotate: '-10deg' }] },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.sm },
    title: { ...typography.title, color: theme.text, fontWeight: '900', lineHeight: 36, marginBottom: spacing.md, maxWidth: '82%' },
    criteria: { ...typography.body, color: theme.textMuted, lineHeight: 22, maxWidth: '88%' },
    timerPanel: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.lg },
    modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    modeButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderColor: theme.border, borderRadius: radius.pill, borderWidth: 1, backgroundColor: theme.surfaceAlt },
    modeButtonActive: { borderColor: theme.primary, backgroundColor: theme.primary },
    modeButtonDisabled: { opacity: 0.64 },
    modeText: { ...typography.caption, color: theme.text, fontWeight: '900' },
    modeTextActive: { color: theme.textOnPrimary },
    timerStage: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
    timer: { color: theme.text, fontSize: 72, fontWeight: '900', lineHeight: 78, letterSpacing: 0 },
    timerHint: { ...typography.caption, color: theme.textMuted, fontWeight: '900', marginTop: spacing.xs },
    progressTrack: { height: 9, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: theme.surfaceAlt, marginTop: spacing.lg },
    progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: theme.accent, minWidth: 8 },
    modeHint: { ...typography.caption, color: theme.textMuted, fontWeight: '800', lineHeight: 18, marginTop: spacing.md, textAlign: 'center' },
    controls: { gap: spacing.sm },
    finishGroup: { gap: spacing.sm, paddingTop: spacing.xs },
    pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
    empty: { flex: 1, justifyContent: 'center', padding: spacing.lg },
    emptyTitle: { ...typography.section, color: theme.text, fontWeight: '900', marginBottom: spacing.md, textAlign: 'center' },
  });
}
