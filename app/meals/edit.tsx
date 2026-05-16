import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedChip } from '@/components/ThemedChip';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { getMealRecordByDateAndType, saveMealRecord } from '@/storage/mealRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { MealMood, MealType } from '@/types';
import { toDateKey } from '@/utils/date';
import { dateInputToDateKey, toDateInputValue } from '@/utils/dateInput';
import { hapticError, hapticSelection, hapticSuccess, hapticWarning } from '@/utils/haptics';
import { getMealMoodLabel, getMealTypeLabel } from '@/utils/mealStats';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const moods: MealMood[] = ['great', 'good', 'normal', 'bad'];

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function isMealType(value?: string): value is MealType {
  return value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack';
}

export default function EditMealScreen() {
  const params = useLocalSearchParams<{ date?: string; mealType?: string; content?: string; rawText?: string }>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [date, setDate] = useState(toDateInputValue(params.date ?? toDateKey()));
  const [mealType, setMealType] = useState<MealType>(isMealType(params.mealType) ? params.mealType : 'breakfast');
  const [content, setContent] = useState(params.content ? decodeURIComponent(params.content) : '');
  const [time, setTime] = useState(getCurrentTime());
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState<MealMood | undefined>();
  const [rawText] = useState(params.rawText ? decodeURIComponent(params.rawText) : undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const normalizedDate = dateInputToDateKey(date);
    if (!normalizedDate) return;
    void getMealRecordByDateAndType(normalizedDate, mealType).then((record) => {
      if (!record) return;
      setContent(record.content);
      setTime(record.time || getCurrentTime());
      setTitle(record.title ?? '');
      setMood(record.mood);
    });
  }, [date, mealType]);

  const save = async () => {
    const normalizedDate = dateInputToDateKey(date);
    if (!normalizedDate) {
      void hapticWarning();
      Alert.alert('日期请使用 2026 08 27 这样的格式。');
      return;
    }

    if (content.trim().length === 0) {
      void hapticWarning();
      Alert.alert('先写下这一餐吃了什么');
      return;
    }
    setSaving(true);
    try {
      await saveMealRecord({
        date: normalizedDate,
        mealType,
        title: title.trim() || undefined,
        content,
        time,
        mood,
        source: rawText ? 'voice-text' : 'manual',
        rawText,
      });
      void hapticSuccess();
      router.back();
    } catch {
      void hapticError();
      Alert.alert('保存失败', '这一餐暂时没有保存成功。');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.kicker}>MEAL NOTE</Text>
            <Text style={styles.title}>记录一餐</Text>
            <Text style={styles.subtitle}>不用分析热量，只认真记下今天吃过什么。</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>餐别</Text>
            <View style={styles.row}>
              {mealTypes.map((item) => (
                <ThemedChip active={mealType === item} key={item} label={getMealTypeLabel(item)} onPress={() => { setMealType(item); void hapticSelection(); }} tone="primary" />
              ))}
            </View>
            <ThemedTextInput label="日期" onChangeText={setDate} value={date} />
            <ThemedTextInput label="吃了什么" multiline onChangeText={setContent} placeholder="鸡蛋牛奶面包" value={content} />
            <ThemedTextInput label="时间" onChangeText={setTime} placeholder="08:30" value={time} />
            <ThemedTextInput label="标题（可选）" onChangeText={setTitle} placeholder="比如：早餐很稳" value={title} />
            <Text style={styles.label}>感受</Text>
            <View style={styles.row}>
              {moods.map((item) => (
                <ThemedChip active={mood === item} key={item} label={getMealMoodLabel(item)} onPress={() => { setMood(item); void hapticSelection(); }} tone="accent" />
              ))}
            </View>
          </View>

          <PrimaryButton disabled={saving} onPress={save} size="large">{saving ? '保存中' : '保存这一餐'}</PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    keyboard: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.md },
    hero: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.xl },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.xs },
    title: { ...typography.title, color: theme.text, fontWeight: '900' },
    subtitle: { ...typography.body, color: theme.textMuted, marginTop: spacing.xs },
    card: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md, gap: spacing.sm },
    label: { ...typography.caption, color: theme.text, fontWeight: '900', marginBottom: spacing.xs },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  });
}
