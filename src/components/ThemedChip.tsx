import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';

type ChipTone = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';

type ThemedChipProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  tone?: ChipTone;
  style?: StyleProp<ViewStyle>;
};

function getToneColor(theme: AppTheme, tone: ChipTone): string {
  if (tone === 'primary') return theme.primary;
  if (tone === 'accent') return theme.accent;
  if (tone === 'success') return theme.success;
  if (tone === 'warning') return theme.warning;
  if (tone === 'danger') return theme.danger;
  return theme.textMuted;
}

export function ThemedChip({ active = false, disabled = false, label, onPress, style, tone = 'default' }: ThemedChipProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const toneColor = getToneColor(theme, tone);
  const content = (
    <Text
      numberOfLines={1}
      style={[
        styles.text,
        { color: active ? (tone === 'accent' ? theme.text : theme.textOnPrimary) : toneColor },
      ]}
    >
      {label}
    </Text>
  );
  const baseStyle = [
    styles.chip,
    {
      backgroundColor: active ? toneColor : theme.surfaceAlt,
      borderColor: active ? toneColor : theme.border,
      opacity: disabled ? 0.48 : 1,
    },
    style,
  ];

  if (!onPress) {
    return <View style={baseStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [baseStyle, pressed && !disabled ? styles.pressed : undefined]}
    >
      {content}
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    chip: {
      minHeight: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    text: {
      ...typography.caption,
      fontWeight: '900',
    },
    pressed: {
      opacity: 0.84,
      transform: [{ scale: 0.985 }],
    },
  });
}
