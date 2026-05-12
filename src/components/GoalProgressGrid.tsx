import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FloatingInfoCard } from './FloatingInfoCard';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { Goal, GoalCheckIn, GoalCheckInStatus, ISODateString } from '@/types';
import { toDateKey } from '@/utils/date';
import { getCheckInMap, getDateRange } from '@/utils/goalStats';
import { hapticSelection } from '@/utils/haptics';

const gridColors = {
  completed: '#FF7AAE',
  partial: '#FFB6D2',
  missed: '#F1D7E2',
  future: '#FFF1F7',
} as const;

type CellState = GoalCheckInStatus | 'future' | 'no-record-past';

type GoalProgressGridProps = {
  goal: Goal;
  checkIns: GoalCheckIn[];
  compact?: boolean;
  maxItems?: number;
};

type SelectedCell = {
  date: ISODateString;
  state: CellState;
  note?: string;
};

const stateLabels: Record<CellState, string> = {
  completed: '已完成',
  partial: '部分完成',
  missed: '未完成',
  future: '还未到来',
  'no-record-past': '过去未记录',
};

function getCellState(date: ISODateString, today: ISODateString, checkIn?: GoalCheckIn): CellState {
  if (checkIn) return checkIn.status;
  return date > today ? 'future' : 'no-record-past';
}

function getCellColor(state: CellState): string {
  if (state === 'completed') return gridColors.completed;
  if (state === 'partial') return gridColors.partial;
  if (state === 'future') return gridColors.future;
  return gridColors.missed;
}

function getDescription(selected: SelectedCell): string {
  if (selected.note?.trim()) return selected.note.trim();
  if (selected.state === 'future') return '未来的这一天，还在等你靠近。';
  if (selected.state === 'no-record-past') return '这一天还没有记录。';
  return '这个小格子还没有留下更多备注。';
}

export function GoalProgressGrid({ compact = false, goal, checkIns, maxItems }: GoalProgressGridProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, compact), [compact, theme]);
  const [selected, setSelected] = useState<SelectedCell | undefined>();
  const today = toDateKey();
  const checkInMap = useMemo(() => getCheckInMap(checkIns), [checkIns]);
  const dateRange = useMemo(() => getDateRange(goal.startDate, goal.targetDate), [goal.startDate, goal.targetDate]);
  const visibleDates = compact ? dateRange.slice(0, maxItems ?? 42) : dateRange;
  const hiddenCount = Math.max(0, dateRange.length - visibleDates.length);

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {visibleDates.map((date) => {
          const checkIn = checkInMap.get(date);
          const state = getCellState(date, today, checkIn);
          const isToday = date === today;
          const isTarget = date === goal.targetDate;

          return (
            <Pressable
              accessibilityLabel={`${date} ${stateLabels[state]}`}
              accessibilityRole="button"
              key={date}
              onPress={() => {
                void hapticSelection();
                setSelected({ date, state, note: checkIn?.note });
              }}
              style={({ pressed }) => [
                styles.cell,
                {
                  backgroundColor: getCellColor(state),
                  borderColor: isToday ? theme.primary : isTarget ? theme.accent : 'transparent',
                  opacity: state === 'partial' ? 0.8 : 1,
                },
                isToday ? styles.todayCell : undefined,
                isTarget ? styles.targetCell : undefined,
                pressed ? styles.pressed : undefined,
              ]}
            >
              {isTarget ? <View style={styles.targetMark} /> : null}
            </Pressable>
          );
        })}
        {hiddenCount > 0 ? (
          <View style={styles.moreCell}>
            <Text style={styles.moreText}>+{hiddenCount}</Text>
          </View>
        ) : null}
      </View>
      <FloatingInfoCard
        visible={Boolean(selected)}
        title={selected ? stateLabels[selected.state] : ''}
        meta={selected?.date}
        description={selected ? getDescription(selected) : undefined}
        onClose={() => setSelected(undefined)}
      />
    </View>
  );
}

function createStyles(theme: AppTheme, compact: boolean) {
  const size = compact ? 10 : 16;
  const gap = compact ? 5 : 8;

  return StyleSheet.create({
    wrap: {
      borderRadius: compact ? radius.medium : radius.large,
      backgroundColor: compact ? 'transparent' : theme.surfaceAlt,
      padding: compact ? 0 : spacing.sm,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap,
    },
    cell: {
      width: size,
      height: size,
      borderRadius: compact ? 4 : 6,
      borderWidth: compact ? 1.5 : 2,
    },
    todayCell: { transform: [{ scale: 1.08 }] },
    targetCell: { borderWidth: compact ? 1.5 : 2 },
    targetMark: {
      position: 'absolute',
      right: -2,
      top: -2,
      width: compact ? 5 : 7,
      height: compact ? 5 : 7,
      borderRadius: 4,
      backgroundColor: theme.accent,
    },
    pressed: { opacity: 0.72, transform: [{ scale: 0.94 }] },
    moreCell: {
      minWidth: compact ? 24 : 36,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      paddingHorizontal: compact ? 4 : spacing.xs,
    },
    moreText: { ...typography.micro, color: theme.textMuted, fontWeight: '900' },
  });
}
