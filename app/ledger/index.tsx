import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyStateBlock } from '@/components/EmptyStateBlock';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getLedgerEntries, getLedgerEntriesByDate, getLedgerEntriesByMonth } from '@/storage/ledgerRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { LedgerEntry } from '@/types';
import { toDateKey } from '@/utils/date';
import { formatCurrency, getBalance, getExpenseTotal, getIncomeTotal, getMonthKey } from '@/utils/ledgerStats';

export default function LedgerScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [todayEntries, setTodayEntries] = useState<LedgerEntry[]>([]);
  const [monthEntries, setMonthEntries] = useState<LedgerEntry[]>([]);
  const [recentEntries, setRecentEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const today = toDateKey();
  const monthKey = getMonthKey(today);

  const loadLedger = useCallback(async () => {
    const [todayList, monthList, allEntries] = await Promise.all([
      getLedgerEntriesByDate(today),
      getLedgerEntriesByMonth(monthKey),
      getLedgerEntries(),
    ]);
    setTodayEntries(todayList);
    setMonthEntries(monthList);
    setRecentEntries(allEntries.slice(0, 12));
    setLoading(false);
  }, [monthKey, today]);

  useFocusEffect(useCallback(() => { void loadLedger(); }, [loadLedger]));

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroShape} />
          <Text style={styles.kicker}>LEDGER</Text>
          <Text style={styles.title}>账本</Text>
          <Text style={styles.subtitle}>把钱花在哪里，也认真看见。</Text>
        </View>

        <View style={styles.metrics}>
          <Metric label="今日支出" value={formatCurrency(getExpenseTotal(todayEntries))} />
          <Metric label="本月支出" value={formatCurrency(getExpenseTotal(monthEntries))} />
          <Metric label="本月收入" value={formatCurrency(getIncomeTotal(monthEntries))} />
          <Metric label="本月结余" value={formatCurrency(getBalance(monthEntries))} />
        </View>

        <PrimaryButton onPress={() => router.push('/ledger/new' as Href)} size="large">记一笔</PrimaryButton>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>今日账单</Text>
          {todayEntries.length === 0 ? (
            <EmptyStateBlock title="今天还没有记账" body="先记下一笔真实发生的小开销。" />
          ) : todayEntries.map((entry) => <LedgerRow entry={entry} key={entry.id} />)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近账单</Text>
          {recentEntries.length === 0 ? <Text style={styles.hint}>还没有账本记录。</Text> : recentEntries.map((entry) => <LedgerRow entry={entry} key={entry.id} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ width: '48%', borderRadius: radius.large, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, padding: spacing.md }}>
      <Text style={{ ...typography.cardTitle, color: theme.primary }}>{value}</Text>
      <Text style={{ ...typography.caption, color: theme.textMuted, marginTop: spacing.xxs }}>{label}</Text>
    </View>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const { theme } = useTheme();
  const sign = entry.type === 'income' ? '+' : '-';
  return (
    <View style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: theme.border, borderBottomWidth: 1, gap: spacing.md, paddingVertical: spacing.sm }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.body, color: theme.text, fontWeight: '900' }}>{entry.categoryLabel}</Text>
        <Text style={{ ...typography.caption, color: theme.textMuted, marginTop: spacing.xxs }}>{entry.date}{entry.note ? ` · ${entry.note}` : ''}</Text>
      </View>
      <Text style={{ ...typography.cardTitle, color: entry.type === 'income' ? theme.success : theme.danger }}>{sign}{formatCurrency(entry.amount)}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
    content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.md },
    hero: { overflow: 'hidden', borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.xl },
    heroShape: { position: 'absolute', right: -26, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: theme.accent, opacity: 0.72 },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.xs },
    title: { ...typography.title, color: theme.text, fontWeight: '900' },
    subtitle: { ...typography.body, color: theme.textMuted, marginTop: spacing.xs },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    section: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md, gap: spacing.sm },
    sectionTitle: { ...typography.section, color: theme.text, fontWeight: '900' },
    hint: { ...typography.caption, color: theme.textMuted },
  });
}
