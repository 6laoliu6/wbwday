import { usePreventRemove } from '@react-navigation/native';
import { router, useNavigation } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PlanningDraftCard } from '@/components/PlanningDraftCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { createTasks } from '@/storage/taskRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { TaskDraft } from '@/types';
import { hapticError, hapticSelection, hapticSuccess } from '@/utils/haptics';
import { parsePlanningText } from '@/utils/parsePlanningText';

const exampleText =
  '例如：今天我要写完报告初稿，至少 1500 字；下午健身 40 分钟；晚上整理房间，把桌面清空。';

export default function MorningPlanScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const allowLeaveRef = useRef(false);
  const [input, setInput] = useState('');
  const [drafts, setDrafts] = useState<TaskDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const hasGeneratedDrafts = drafts.length > 0;

  usePreventRemove(hasGeneratedDrafts, ({ data }) => {
    if (allowLeaveRef.current) {
      navigation.dispatch(data.action);
      return;
    }

    Alert.alert('放弃这次晨间规划？', '生成的任务草稿还没有保存，返回后会丢失。', [
      { text: '继续编辑', style: 'cancel' },
      {
        text: '放弃',
        style: 'destructive',
        onPress: () => {
          allowLeaveRef.current = true;
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const canSave = useMemo(
    () =>
      drafts.some(
        (draft) =>
          draft.title.trim().length > 0 && draft.estimatedMinutes > 0,
      ),
    [drafts],
  );

  const generateDrafts = useCallback(() => {
    if (input.trim().length === 0) {
      Alert.alert('先写下今天想完成什么。');
      return;
    }

    const nextDrafts = parsePlanningText(input);

    if (nextDrafts.length === 0) {
      Alert.alert('没有识别到有效任务，可以换种方式描述。');
      return;
    }

    setDrafts(nextDrafts);
    void hapticSelection();
  }, [input]);

  const updateDraft = useCallback((nextDraft: TaskDraft) => {
    setDrafts((current) => current.map((draft) => (draft.id === nextDraft.id ? nextDraft : draft)));
  }, []);

  const deleteDraft = useCallback((id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }, []);

  const saveDrafts = useCallback(async () => {
    if (!canSave || saving) return;

    const validDrafts = drafts.filter(
      (draft) =>
        draft.title.trim().length > 0 && draft.estimatedMinutes > 0,
    );

    setSaving(true);

    try {
      await createTasks(
        validDrafts.map((draft) => ({
          title: draft.title,
          completionCriteria: draft.completionStandard,
          importance: draft.importance,
          estimatedMinutes: draft.estimatedMinutes,
          note: draft.note,
        })),
      );

      allowLeaveRef.current = true;
      setDrafts([]);
      void hapticSuccess();
      Alert.alert('WBWday 已保存今天的计划。', undefined, [
        { text: '好', onPress: () => router.replace('/') },
      ]);
    } catch {
      void hapticError();
      Alert.alert('保存失败', '任务没有保存成功，请稍后再试。');
      setSaving(false);
    }
  }, [canSave, drafts, saving]);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.heroDot} />
            <Text style={styles.kicker}>MORNING SETUP</Text>
            <Text style={styles.title}>{'今天想完成什么？'}</Text>
            <Text style={styles.description}>{'把今天想做的事写下来，WBWday 会帮你拆成任务卡。'}</Text>
          </View>

          <View style={styles.inputPanel}>
            <ThemedTextInput
              multiline
              onChangeText={setInput}
              placeholder={exampleText}
              inputStyle={styles.planningInput}
              value={input}
            />
            <Text style={styles.example}>{exampleText}</Text>
          </View>

          <View style={styles.actionRow}>
            <View style={styles.actionItem}><VoiceInputButton /></View>
            <View style={styles.actionItem}><PrimaryButton onPress={generateDrafts}>{'生成任务'}</PrimaryButton></View>
          </View>

          {hasGeneratedDrafts ? (
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{'任务草稿'}</Text>
              <Text style={styles.previewHint}>{'保存前可以继续编辑'}</Text>
            </View>
          ) : null}

          {drafts.map((draft, index) => (
            <PlanningDraftCard draft={draft} index={index} key={draft.id} onChange={updateDraft} onDelete={() => deleteDraft(draft.id)} />
          ))}

          {hasGeneratedDrafts ? (
            <View style={styles.saveArea}>
              <PrimaryButton disabled={!canSave || saving} onPress={saveDrafts} size="large">
                {saving ? '保存中' : '保存到今日'}
              </PrimaryButton>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    keyboard: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    hero: {
      overflow: 'hidden',
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderWidth: 1,
      backgroundColor: theme.surface,
      marginBottom: spacing.md,
      padding: spacing.xl,
    },
    heroDot: {
      position: 'absolute',
      right: -24,
      top: -30,
      width: 112,
      height: 112,
      borderRadius: 56,
      backgroundColor: theme.accent,
      opacity: 0.78,
    },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.xs },
    title: { ...typography.title, color: theme.text, fontWeight: '900', marginBottom: spacing.sm },
    description: { ...typography.body, color: theme.textMuted, lineHeight: 22, maxWidth: '84%' },
    inputPanel: {
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderWidth: 1,
      backgroundColor: theme.surface,
      padding: spacing.md,
    },
    planningInput: {
      minHeight: 176,
      fontSize: 17,
      lineHeight: 25,
    },
    example: { ...typography.caption, color: theme.textMuted, lineHeight: 19, marginTop: spacing.sm },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    actionItem: { flex: 1 },
    previewHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginTop: spacing.xl },
    previewTitle: { ...typography.section, color: theme.text, fontWeight: '900' },
    previewHint: { ...typography.caption, color: theme.textMuted, fontWeight: '900' },
    saveArea: { marginTop: spacing.xs },
  });
}
