import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';

type EmptyStateBlockProps = {
  title: string;
  body?: string;
  action?: ReactNode;
  compact?: boolean;
};

export function EmptyStateBlock({ action, body, compact = false, title }: EmptyStateBlockProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, compact), [compact, theme]);

  return (
    <View style={styles.empty}>
      <View style={styles.dot} />
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

function createStyles(theme: AppTheme, compact: boolean) {
  return StyleSheet.create({
    empty: {
      alignItems: 'center',
      borderColor: theme.border,
      borderRadius: compact ? radius.large : radius.xlarge,
      borderStyle: 'dashed',
      borderWidth: 1,
      backgroundColor: theme.surface,
      padding: compact ? spacing.lg : spacing.xl,
    },
    dot: {
      width: compact ? 20 : 28,
      height: compact ? 20 : 28,
      borderRadius: compact ? 10 : 14,
      backgroundColor: theme.accent,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.cardTitle,
      color: theme.text,
      fontWeight: '900',
      textAlign: 'center',
    },
    body: {
      ...typography.body,
      color: theme.textMuted,
      lineHeight: 22,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    action: {
      alignSelf: 'stretch',
      marginTop: spacing.lg,
    },
  });
}
