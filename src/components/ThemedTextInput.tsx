import { forwardRef, useMemo } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';

import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';

type ThemedTextInputProps = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
};

export const ThemedTextInput = forwardRef<TextInput, ThemedTextInputProps>(function ThemedTextInput(
  { containerStyle, error, helper, inputStyle, label, multiline, style, ...props },
  ref,
) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        multiline={multiline}
        placeholderTextColor={theme.textMuted}
        ref={ref}
        selectionColor={theme.primary}
        style={[styles.input, multiline ? styles.textArea : undefined, inputStyle, style]}
        textAlignVertical={multiline ? 'top' : props.textAlignVertical}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      ...typography.caption,
      color: theme.text,
      fontWeight: '900',
      marginBottom: spacing.xs,
    },
    input: {
      minHeight: 50,
      borderColor: theme.border,
      borderRadius: radius.medium,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
      color: theme.text,
      fontSize: 16,
      lineHeight: 23,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    textArea: {
      minHeight: 104,
    },
    helper: {
      ...typography.caption,
      color: theme.textMuted,
      lineHeight: 18,
      marginTop: spacing.xs,
    },
    error: {
      ...typography.caption,
      color: theme.danger,
      lineHeight: 18,
      marginTop: spacing.xs,
    },
  });
}
