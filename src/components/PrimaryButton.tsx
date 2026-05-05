import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors } from '@/constants/theme';

type PrimaryButtonProps = PressableProps & {
  children: ReactNode;
  variant?: 'filled' | 'soft' | 'ghost';
};

export function PrimaryButton({
  children,
  disabled,
  variant = 'filled',
  style,
  ...props
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        styles[variant],
        state.pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Text style={[styles.label, variant !== 'filled' ? styles.darkLabel : undefined]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  filled: {
    backgroundColor: colors.accent,
  },
  soft: {
    backgroundColor: colors.surfaceSoft,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderWidth: 1,
  },
  label: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  darkLabel: {
    color: colors.ink,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
});
