import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { getMealRecordsByDate } from '@/storage/mealRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { MealRecord, MealType } from '@/types';
import { formatChineseDate, toDateKey } from '@/utils/date';
import { hapticSelection, hapticWarning } from '@/utils/haptics';
import { getMealCompletionPercent, getMealsCompletedCount, getMealSummaryByDate, getMealTypeLabel } from '@/utils/mealStats';
import { parseMealText } from '@/utils/parseMealText';

const coreMealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];

export default function MealsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [quickText, setQuickText] = useState('');
  const [loading, setLoading] = useState(true);
  const today = toDateKey();

  const loadMeals = useCallback(async () => {
    setRecords(await getMealRecordsByDate(today));
    setLoading(false);
  }, [today]);

  useFocusEffect(useCallback(() => { void loadMeals(); }, [loadMeals]));

  const summary = getMealSummaryByDate(records);
  const completedCount = getMealsCompletedCount(records);
  const percent = getMealCompletionPercent(records);

  const recognize = () => {
    const parsed = parseMealText(quickText);
    if (!parsed?.date || !parsed.mealType || !parsed.content) {
      void hapticWarning();
      Alert.alert('暂时没识别出来，可以手动选择餐别记录。');
      return;
    }
    void hapticSelection();
    router.push(`/meals/edit?date=${parsed.date}&mealType=${parsed.mealType}&content=${encodeURIComponent(parsed.content)}&rawText=${encodeURIComponent(quickText)}` as Href);
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroShape} />
          <Text style={styles.kicker}>MEALS</Text>
          <Text style={styles.title}>今日三餐</Text>
          <Text style={styles.subtitle}>认真吃饭，也是认真生活的一部分。</Text>
          <Text style={styles.date}>{formatChineseDate(today)}</Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressValue}>已记录 {completedCount} / 3 餐</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${percent}%` }]} /></View>
        </View>

        {coreMealTypes.map((mealType) => (
          <MealCard key={mealType} mealType={mealType} record={summary[mealType]} />
        ))}
        <MealCard mealType="snack" record={summary.snack} />

        <View style={styles.quickCard}>
          <Text style={styles.sectionTitle}>快速记录</Text>
          <Text style={styles.hint}>先用文字模拟语音输入，后续可接真实语音识别。</Text>
          <ThemedTextInput onChangeText={setQuickText} placeholder="例如：早餐吃了鸡蛋牛奶面包" value={quickText} />
          <PrimaryButton onPress={recognize} variant="soft">识别并记录</PrimaryButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MealCard({ mealType, record }: { mealType: MealType; record?: MealRecord }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/meals/edit?date=${record?.date ?? toDateKey()}&mealType=${mealType}` as Href)}
      style={({ pressed }) => [{ borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md, opacity: pressed ? 0.82 : 1 }]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.section, color: theme.text, fontWeight: '900' }}>{getMealTypeLabel(mealType)}</Text>
          <Text style={{ ...typography.body, color: record ? theme.text : theme.textMuted, marginTop: spacing.xs }} numberOfLines={2}>
            {record?.content || '还没有记录'}
          </Text>
          {record?.time ? <Text style={{ ...typography.caption, color: theme.textMuted, marginTop: spacing.xxs }}>{record.time}</Text> : null}
        </View>
        <Text style={{ ...typography.caption, color: record ? theme.success : theme.textMuted, fontWeight: '900' }}>{record ? '已记录' : '待记录'}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
    content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.md },
    hero: { overflow: 'hidden', borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.xl },
    heroShape: { position: 'absolute', right: -20, top: -26, width: 112, height: 112, borderRadius: 56, backgroundColor: theme.accent, opacity: 0.72 },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.xs },
    title: { ...typography.title, color: theme.text, fontWeight: '900' },
    subtitle: { ...typography.body, color: theme.textMuted, marginTop: spacing.xs },
    date: { ...typography.caption, color: theme.primary, marginTop: spacing.md, fontWeight: '900' },
    progressCard: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md },
    progressValue: { ...typography.cardTitle, color: theme.primary, fontWeight: '900' },
    track: { height: 10, borderRadius: radius.pill, backgroundColor: theme.surfaceAlt, marginTop: spacing.sm, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: radius.pill, backgroundColor: theme.accent },
    quickCard: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md },
    sectionTitle: { ...typography.section, color: theme.text, fontWeight: '900' },
    hint: { ...typography.caption, color: theme.textMuted, marginBottom: spacing.sm, marginTop: spacing.xs },
  });
}
