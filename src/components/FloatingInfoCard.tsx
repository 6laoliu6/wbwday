import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useTheme } from '@/theme';

type FloatingInfoCardProps = {
  visible: boolean;
  title: string;
  description?: string;
  meta?: string;
  onClose: () => void;
};

export function FloatingInfoCard({ description, meta, onClose, title, visible }: FloatingInfoCardProps) {
  const { theme } = useTheme();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.primary,
            },
          ]}
        >
          {meta ? <Text style={[styles.meta, { color: theme.primary }]}>{meta}</Text> : null}
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {description ? <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text> : null}
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed ? styles.pressed : undefined]}
          >
            <Text style={[styles.buttonText, { color: theme.textOnPrimary }]}>知道了</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 24, 32, 0.22)',
    padding: spacing.lg,
  },
  card: {
    borderRadius: radius.xlarge,
    borderWidth: 1,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 8,
  },
  meta: {
    ...typography.micro,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.section,
    fontWeight: '900',
  },
  description: {
    ...typography.body,
    lineHeight: 23,
    marginTop: spacing.xs,
  },
  button: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
});
