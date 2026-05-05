import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

type AttachmentCardProps = {
  title: string;
  content: string;
  muted?: boolean;
};

export function AttachmentCard({ title, content, muted = false }: AttachmentCardProps) {
  return (
    <View style={[styles.card, muted ? styles.mutedCard : undefined]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.content, muted ? styles.mutedContent : undefined]}>{content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 186,
    minHeight: 100,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 14,
  },
  mutedCard: {
    width: '100%',
    minHeight: 0,
    backgroundColor: colors.surfaceSoft,
    opacity: 0.76,
  },
  title: {
    color: colors.accentDark,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  content: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  mutedContent: {
    fontSize: 13,
  },
});
