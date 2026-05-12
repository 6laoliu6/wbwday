import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyStateBlock } from '@/components/EmptyStateBlock';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProofPhotoWall } from '@/components/ProofPhotoWall';
import { getFocusSessionsByDate } from '@/storage/focusRepository';
import { getCompletionProofsByDate } from '@/storage/proofRepository';
import { getAllReviews } from '@/storage/reviewRepository';
import { getTaskDates, getTasksByDate } from '@/storage/taskRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { DailyReview, ISODateString } from '@/types';
import { formatChineseDate } from '@/utils/date';
import { buildReviewStats, type ReviewStats } from '@/utils/reviewStats';
import { formatFocusDuration } from '@/utils/time';

type HistorySummary = { date: ISODateString; review?: DailyReview; stats: ReviewStats };

function getSummaryExcerpt(summary?: string): string {
  const trimmed = summary?.trim();
  if (!trimmed) return '还没有今日总结';
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
}

export default function HistoryScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [summaries, setSummaries] = useState<HistorySummary[]>([]);

  const loadHistory = useCallback(async () => {
    const [taskDates, reviews] = await Promise.all([getTaskDates(), getAllReviews()]);
    const dates = Array.from(new Set<ISODateString>([...taskDates, ...reviews.map((review) => review.date)])).sort((a, b) => b.localeCompare(a));
    const nextSummaries = await Promise.all(dates.map(async (date) => {
      const [tasks, focusSessions, proofs] = await Promise.all([getTasksByDate(date), getFocusSessionsByDate(date), getCompletionProofsByDate(date)]);
      return { date, review: reviews.find((review) => review.date === date), stats: buildReviewStats(tasks, focusSessions, proofs) };
    }));
    setSummaries(nextSummaries);
  }, []);

  useFocusEffect(useCallback(() => { void loadHistory(); }, [loadHistory]));

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroBar} />
          <Text style={styles.kicker}>WBWday ARCHIVE</Text>
          <Text style={styles.title}>{'历史记录'}</Text>
          <Text style={styles.description}>{'每一天都留在这里：完成了什么，专注了多久，以及写给自己的那句话。'}</Text>
        </View>

        {summaries.length === 0 ? (
          <EmptyStateBlock title="还没有历史记录" body="先认真过完今天，完成一次晚间复盘后这里就会亮起来。" />
        ) : summaries.map((summary, index) => (
          <Pressable accessibilityRole="button" key={summary.date} onPress={() => router.push(`/review/${summary.date}` as Href)} style={({ pressed }) => [styles.record, pressed ? styles.pressed : undefined]}>
            <View style={styles.recordHeader}>
              <View style={styles.indexBadge}><Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text></View>
              <View style={styles.recordHeaderCopy}>
                <Text style={styles.recordDate}>{formatChineseDate(summary.date)}</Text>
                <Text style={styles.ratingText}>{summary.review?.rating ? `${summary.review.rating} 分` : '未评分'}</Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              <Metric label="完成" theme={theme} value={`${summary.stats.completedCount}/${summary.stats.totalCount}`} />
              <Metric label="专注" theme={theme} value={formatFocusDuration(summary.stats.totalFocusSeconds)} />
              <Metric label="还愿" theme={theme} value={`${summary.stats.proofPhotos.length} 张`} />
            </View>
            <Text style={styles.summaryText}>{getSummaryExcerpt(summary.review?.summary)}</Text>
            {summary.stats.proofPhotos.length > 0 ? <View style={styles.photoPreview}><ProofPhotoWall proofs={summary.stats.proofPhotos} maxPhotos={3} /></View> : null}
          </Pressable>
        ))}

        <PrimaryButton onPress={() => router.push('/' as Href)} variant="soft">{'回到今日'}</PrimaryButton>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, theme, value }: { label: string; theme: AppTheme; value: string }) {
  return <View style={{ borderRadius: radius.medium, backgroundColor: theme.surfaceAlt, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}><Text style={{ ...typography.caption, color: theme.primary, fontWeight: '900' }}>{value}</Text><Text style={{ ...typography.micro, color: theme.textMuted, fontWeight: '900' }}>{label}</Text></View>;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    hero: { overflow: 'hidden', borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, marginBottom: spacing.md, padding: spacing.xl },
    heroBar: { position: 'absolute', right: -22, bottom: -18, width: 156, height: 52, borderRadius: radius.large, backgroundColor: theme.accent, transform: [{ rotate: '-8deg' }] },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.xs },
    title: { ...typography.title, color: theme.text, fontWeight: '900', marginBottom: spacing.sm },
    description: { ...typography.body, color: theme.textMuted, lineHeight: 22, maxWidth: '88%' },
    record: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, marginBottom: spacing.md, padding: spacing.md },
    pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
    recordHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    indexBadge: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.medium, backgroundColor: theme.primary },
    indexText: { ...typography.caption, color: theme.textOnPrimary, fontWeight: '900' },
    recordHeaderCopy: { flex: 1 },
    recordDate: { ...typography.cardTitle, color: theme.text, fontWeight: '900' },
    ratingText: { ...typography.caption, color: theme.textMuted, fontWeight: '900', marginTop: spacing.xxs },
    metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    summaryText: { ...typography.body, color: theme.textMuted, lineHeight: 22 },
    photoPreview: { marginTop: spacing.md },
  });
}
