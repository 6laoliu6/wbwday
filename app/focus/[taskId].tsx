import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/theme';
import { addFocusSession } from '@/storage/focusRepository';
import { addFocusSecondsToTask, getTaskById } from '@/storage/taskRepository';
import type { FocusMode, Task } from '@/types';
import { formatTimer } from '@/utils/time';

const POMODORO_SECONDS = 25 * 60;
const MIN_SAVE_SECONDS = 5;

type TimerStatus = 'idle' | 'running' | 'paused';

const focusModeLabels: Record<FocusMode, string> = {
  normal: '普通计时',
  pomodoro: '番茄钟 25 分钟',
};

export default function FocusScreen() {
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
    if (!taskId) {
      setLoading(false);
      return;
    }

    const nextTask = await getTaskById(taskId);
    setTask(nextTask);
    setLoading(false);
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      void loadTask();
    }, [loadTask]),
  );

  useEffect(() => {
    if (status !== 'running') {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setElapsedSeconds((current) => {
        const next = current + 1;
        return mode === 'pomodoro' ? Math.min(next, POMODORO_SECONDS) : next;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [mode, status]);

  const displayedSeconds = useMemo(
    () => (mode === 'pomodoro' ? Math.max(0, POMODORO_SECONDS - elapsedSeconds) : elapsedSeconds),
    [elapsedSeconds, mode],
  );

  const saveSession = useCallback(
    async (durationSeconds: number, completed: boolean) => {
      if (!taskId || saving) {
        return;
      }

      const safeDuration = Math.max(0, Math.floor(durationSeconds));
      const startedAtValue = startedAt ?? new Date().toISOString();
      const endedAt = new Date().toISOString();
      setSaving(true);

      try {
        await addFocusSession(taskId, {
          mode,
          startedAt: startedAtValue,
          endedAt,
          durationSeconds: safeDuration,
          completed,
        });
        await addFocusSecondsToTask(taskId, safeDuration);
        Alert.alert('专注已保存', '本次专注已经记录到任务里。', [
          {
            text: '好',
            onPress: () => router.replace(`/task/${taskId}` as Href),
          },
        ]);
      } catch {
        Alert.alert('保存失败', '专注记录没有保存成功，请稍后再试。');
        setSaving(false);
      }
    },
    [mode, saving, startedAt, taskId],
  );

  useEffect(() => {
    if (
      mode !== 'pomodoro' ||
      status !== 'running' ||
      elapsedSeconds < POMODORO_SECONDS ||
      pomodoroCompletedRef.current
    ) {
      return;
    }

    pomodoroCompletedRef.current = true;
    setStatus('paused');
    Alert.alert('本轮番茄钟完成', '已完成 25 分钟专注，是否保存本轮记录？', [
      {
        text: '保存',
        onPress: () => void saveSession(POMODORO_SECONDS, true),
      },
    ]);
  }, [elapsedSeconds, mode, saveSession, status]);

  const start = useCallback(() => {
    if (status !== 'idle') {
      return;
    }

    setStartedAt(new Date().toISOString());
    setStatus('running');
  }, [status]);

  const pause = useCallback(() => {
    if (status === 'running') {
      setStatus('paused');
    }
  }, [status]);

  const resume = useCallback(() => {
    if (status === 'paused') {
      setStatus('running');
    }
  }, [status]);

  const endFocus = useCallback(() => {
    const durationSeconds = mode === 'pomodoro' ? Math.min(elapsedSeconds, POMODORO_SECONDS) : elapsedSeconds;

    if (durationSeconds < MIN_SAVE_SECONDS) {
      Alert.alert('本次专注时间太短', '少于 5 秒的专注不会保存。', [
        { text: '继续专注', style: 'cancel' },
        {
          text: '放弃',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]);
      return;
    }

    setStatus('paused');
    void saveSession(durationSeconds, mode === 'normal' || durationSeconds >= POMODORO_SECONDS);
  }, [elapsedSeconds, mode, saveSession]);

  const abandon = useCallback(() => {
    Alert.alert('放弃本次专注？', '本次计时不会保存。', [
      { text: '继续专注', style: 'cancel' },
      {
        text: '放弃',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  }, []);

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
      <View style={styles.content}>
        <View style={styles.taskBlock}>
          <Text style={styles.taskLabel}>当前任务</Text>
          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.criteria}>完成标准：{task.completionCriteria}</Text>
        </View>

        <View style={styles.modeBlock}>
          <Text style={styles.sectionLabel}>专注模式</Text>
          <View style={styles.modeRow}>
            <PrimaryButton
              disabled={status !== 'idle'}
              onPress={() => setMode('normal')}
              variant={mode === 'normal' ? 'filled' : 'soft'}
            >
              普通计时
            </PrimaryButton>
            <PrimaryButton
              disabled={status !== 'idle'}
              onPress={() => setMode('pomodoro')}
              variant={mode === 'pomodoro' ? 'filled' : 'soft'}
            >
              番茄钟
            </PrimaryButton>
          </View>
          <Text style={styles.modeHint}>
            {status === 'idle' ? `当前：${focusModeLabels[mode]}` : '专注开始后不能切换模式'}
          </Text>
        </View>

        <View style={styles.timerBlock}>
          <Text style={styles.timer}>{formatTimer(displayedSeconds)}</Text>
          <Text style={styles.timerHint}>{mode === 'pomodoro' ? '剩余时间' : '已专注时间'}</Text>
        </View>

        <View style={styles.controls}>
          {status === 'idle' ? <PrimaryButton onPress={start}>开始</PrimaryButton> : null}
          {status === 'running' ? <PrimaryButton onPress={pause} variant="soft">暂停</PrimaryButton> : null}
          {status === 'paused' ? <PrimaryButton onPress={resume}>继续</PrimaryButton> : null}
          {status !== 'idle' ? (
            <>
              <PrimaryButton disabled={saving} onPress={endFocus} variant="soft">
                结束专注
              </PrimaryButton>
              <PrimaryButton disabled={saving} onPress={abandon} variant="ghost">
                放弃本次专注
              </PrimaryButton>
            </>
          ) : (
            <PrimaryButton onPress={() => router.back()} variant="ghost">
              返回
            </PrimaryButton>
          )}
        </View>
      </View>
    </SafeAreaView>
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
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 36,
  },
  taskBlock: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: 18,
  },
  taskLabel: {
    color: colors.accentDark,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 32,
    marginBottom: 10,
  },
  criteria: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  modeBlock: {
    marginTop: 20,
  },
  sectionLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeHint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  timerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  timer: {
    color: colors.ink,
    fontSize: 64,
    fontWeight: '900',
  },
  timerHint: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  controls: {
    gap: 12,
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
