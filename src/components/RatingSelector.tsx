import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useTheme } from '@/theme';

const ratingLabels: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '摆烂',
  2: '一般',
  3: '还行',
  4: '不错',
  5: '很满意',
};

type RatingSelectorProps = {
  value?: 1 | 2 | 3 | 4 | 5;
  onChange: (rating: 1 | 2 | 3 | 4 | 5) => void;
};

export function RatingSelector({ value, onChange }: RatingSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      {([1, 2, 3, 4, 5] as const).map((rating) => {
        const active = value === rating;
        return (
          <Pressable
            accessibilityRole="button"
            key={rating}
            onPress={() => onChange(rating)}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: active ? theme.primary : theme.surfaceAlt, borderColor: active ? theme.primary : theme.border },
              pressed ? styles.pressed : undefined,
            ]}
          >
            <Text style={[styles.number, { color: active ? theme.textOnPrimary : theme.text }]}>{rating}</Text>
            <Text style={[styles.label, { color: active ? theme.textOnPrimary : theme.textMuted }]} numberOfLines={1}>{ratingLabels[rating]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  item: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', borderRadius: radius.medium, borderWidth: 1, paddingHorizontal: 4 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  number: { fontSize: 20, fontWeight: '900', marginBottom: 3 },
  label: { ...typography.micro, fontWeight: '900' },
});
