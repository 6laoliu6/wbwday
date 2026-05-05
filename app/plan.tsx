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
  TextInput,
  View,
} from 'react-native';

import { PlanningDraftCard } from '@/components/PlanningDraftCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { colors } from '@/constants/theme';
import { createTasks } from '@/storage/taskRepository';
import type { TaskDraft } from '@/types';
import { parsePlanningText } from '@/utils/parsePlanningText';

const exampleText =
  '例如：今天我要写完报告初稿，至少 1500 字；下午健身 40 分钟；晚上整理房间，把桌面清空。';

export default function MorningPlanScreen() {
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
          draft.title.trim().length > 0 &&
          draft.completionStandard.trim().length > 0 &&
          draft.estimatedMinutes > 0,
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
  }, [input]);

  const updateDraft = useCallback((nextDraft: TaskDraft) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === nextDraft.id ? nextDraft : draft)),
    );
  }, []);

  const deleteDraft = useCallback((id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }, []);

  const saveDrafts = useCallback(async () => {
    if (!canSave || saving) {
      return;
    }

    const validDrafts = drafts.filter(
      (draft) =>
        draft.title.trim().length > 0 &&
        draft.completionStandard.trim().length > 0 &&
        draft.estimatedMinutes > 0,
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
      Alert.alert('今日立愿已保存。', undefined, [
        {
          text: '好',
          onPress: () => router.replace('/'),
        },
      ]);
    } catch {
      Alert.alert('保存失败', '任务没有保存成功，请稍后再试。');
      setSaving(false);
    }
  }, [canSave, drafts, saving]);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>今天想完成什么？</Text>
          <Text style={styles.description}>把今天想做的事写下来，我会帮你拆成任务卡。</Text>

          <TextInput
            multiline
            onChangeText={setInput}
            placeholder={exampleText}
            placeholderTextColor={colors.muted}
            style={styles.planningInput}
            textAlignVertical="top"
            value={input}
          />

          <Text style={styles.example}>{exampleText}</Text>

          <View style={styles.actionRow}>
            <VoiceInputButton />
            <PrimaryButton onPress={generateDrafts}>生成任务</PrimaryButton>
          </View>

          {hasGeneratedDrafts ? (
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>任务草稿</Text>
              <Text style={styles.previewHint}>保存前可以继续编辑</Text>
            </View>
          ) : null}

          {drafts.map((draft, index) => (
            <PlanningDraftCard
              draft={draft}
              index={index}
              key={draft.id}
              onChange={updateDraft}
              onDelete={() => deleteDraft(draft.id)}
            />
          ))}

          {hasGeneratedDrafts ? (
            <View style={styles.saveArea}>
              <PrimaryButton disabled={!canSave || saving} onPress={saveDrafts}>
                {saving ? '保存中' : '保存到今日'}
              </PrimaryButton>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 44,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
    marginBottom: 8,
  },
  description: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 18,
  },
  planningInput: {
    minHeight: 170,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 17,
    lineHeight: 25,
    padding: 16,
  },
  example: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  previewHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 24,
  },
  previewTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  previewHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  saveArea: {
    marginTop: 4,
  },
});
