import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography, type AppTheme, useTheme } from '@/theme';

type SectionHeaderProps = {
  title: string;
  hint?: string;
  action?: ReactNode;
};

export function SectionHeader({ action, hint, title }: SectionHeaderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {action}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    copy: {
      flex: 1,
    },
    title: {
      ...typography.section,
      color: theme.text,
      fontWeight: '900',
    },
    hint: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: '800',
      marginTop: spacing.xxs,
    },
  });
}
