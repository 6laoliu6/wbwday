import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { motion, radius, spacing, typography, useTheme } from '@/theme';

type PrimaryButtonProps = PressableProps & {
  children: ReactNode;
  variant?: 'filled' | 'soft' | 'ghost' | 'quiet';
  size?: 'base' | 'large';
};

export function PrimaryButton({
  children,
  disabled,
  size = 'base',
  variant = 'filled',
  style,
  ...props
}: PrimaryButtonProps) {
  const { theme } = useTheme();
  const isFilled = variant === 'filled';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        styles[`${size}Size`],
        variant === 'filled'
          ? {
              backgroundColor: theme.primary,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.16,
              shadowRadius: 18,
              elevation: 3,
            }
          : undefined,
        variant === 'soft'
          ? {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.border,
              borderWidth: 1,
            }
          : undefined,
        variant === 'ghost'
          ? {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderWidth: 1,
            }
          : undefined,
        variant === 'quiet' ? styles.quiet : undefined,
        state.pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.label,
          {
            color: isFilled
              ? theme.textOnPrimary
              : variant === 'quiet'
                ? theme.textMuted
                : theme.primary,
          },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  baseSize: {
    minHeight: 46,
  },
  largeSize: {
    minHeight: 58,
    paddingHorizontal: spacing.xl,
  },
  quiet: {
    backgroundColor: 'transparent',
  },
  label: {
    ...typography.body,
    fontWeight: '900',
  },
  pressed: {
    opacity: motion.pressOpacity,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: motion.disabledOpacity,
  },
});
