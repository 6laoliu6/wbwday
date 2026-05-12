import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyStateBlock } from '@/components/EmptyStateBlock';
import { radius, spacing, themePresets, typography, type AppTheme, useTheme } from '@/theme';
import { hapticError, hapticSelection, hapticSuccess } from '@/utils/haptics';

export default function ThemeScreen() {
  const { selectedThemeKey, setThemeKey, theme } = useTheme();
  const styles = createStyles(theme);

  const applyTheme = async (nextTheme: AppTheme) => {
    if (nextTheme.key === selectedThemeKey) return;

    void hapticSelection();

    try {
      await setThemeKey(nextTheme.key);
      void hapticSuccess();
      Alert.alert(`已切换为「${nextTheme.name}」`);
    } catch {
      void hapticError();
      Alert.alert('保存失败', '主题没有保存成功，请稍后再试。');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>{'外观主题'}</Text>
          <Text style={styles.subtitle}>{'选择今天的色彩心情'}</Text>
          <View style={styles.heroMarks}>
            <View style={styles.heroPrimary} />
            <View style={styles.heroAccent} />
            <View style={styles.heroLine} />
          </View>
        </View>

        {themePresets.length === 0 ? (
          <EmptyStateBlock title="暂时没有主题" body="稍后再来看看。" />
        ) : (
          <View style={styles.gallery}>
            {themePresets.map((preset) => {
              const selected = preset.key === selectedThemeKey;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={preset.key}
                  onPress={() => void applyTheme(preset)}
                  style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: preset.surface, borderColor: selected ? preset.primary : preset.border },
                    selected ? styles.selectedCard : undefined,
                    pressed ? styles.pressed : undefined,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.nameBlock}>
                      <Text style={[styles.cardName, { color: preset.text }]}>{preset.name}</Text>
                      <Text style={[styles.cardKey, { color: preset.textMuted }]}>{preset.key}</Text>
                    </View>
                    {selected ? (
                      <View style={[styles.check, { backgroundColor: preset.primary }]}>
                        <Text style={[styles.checkText, { color: preset.textOnPrimary }]}>?</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.swatchRow}>
                    <View style={[styles.primarySwatch, { backgroundColor: preset.primary }]} />
                    <View style={[styles.accentSwatch, { backgroundColor: preset.accent }]} />
                  </View>

                  <View style={[styles.preview, { backgroundColor: preset.background }]}>
                    <View style={[styles.previewBlock, { backgroundColor: preset.primary }]} />
                    <View style={[styles.previewCircle, { backgroundColor: preset.accent }]} />
                    <View style={[styles.previewSurface, { backgroundColor: preset.surface }]}> 
                      <View style={[styles.previewLineLong, { backgroundColor: preset.text }]} />
                      <View style={[styles.previewLineShort, { backgroundColor: preset.textMuted }]} />
                      <View style={[styles.previewButton, { backgroundColor: preset.primary }]}> 
                        <Text style={[styles.previewButtonText, { color: preset.textOnPrimary }]}>Start</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { padding: spacing.lg, paddingBottom: spacing.huge },
    hero: {
      minHeight: 180,
      borderRadius: radius.xlarge,
      backgroundColor: theme.surface,
      overflow: 'hidden',
      padding: spacing.xl,
      marginBottom: spacing.lg,
      borderColor: theme.border,
      borderWidth: 1,
    },
    title: { ...typography.display, color: theme.text, fontWeight: '900' },
    subtitle: { ...typography.body, color: theme.textMuted, marginTop: spacing.xs },
    heroMarks: { position: 'absolute', right: -22, bottom: -18, width: 170, height: 150 },
    heroPrimary: { position: 'absolute', right: 28, top: 18, width: 94, height: 112, borderRadius: radius.large, backgroundColor: theme.primary, transform: [{ rotate: '9deg' }] },
    heroAccent: { position: 'absolute', right: 96, top: 40, width: 62, height: 62, borderRadius: 31, backgroundColor: theme.accent },
    heroLine: { position: 'absolute', right: 0, bottom: 28, width: 150, height: 28, borderRadius: radius.pill, backgroundColor: theme.primary, opacity: 0.72, transform: [{ rotate: '-18deg' }] },
    gallery: { gap: spacing.lg },
    card: { borderRadius: radius.xlarge, borderWidth: 1, padding: spacing.lg },
    selectedCard: { borderWidth: 2, shadowColor: theme.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 3 },
    pressed: { opacity: 0.9, transform: [{ scale: 0.992 }] },
    cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
    nameBlock: { flex: 1 },
    cardName: { ...typography.cardTitle, fontWeight: '900' },
    cardKey: { ...typography.caption, marginTop: 3 },
    check: { alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 15 },
    checkText: { fontSize: 16, fontWeight: '900' },
    swatchRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md },
    primarySwatch: { flex: 1, height: 38, borderRadius: radius.pill },
    accentSwatch: { width: 76, height: 38, borderRadius: radius.pill },
    preview: { height: 122, borderRadius: radius.medium, marginTop: spacing.md, overflow: 'hidden' },
    previewBlock: { position: 'absolute', right: 22, top: 18, width: 62, height: 74, borderRadius: radius.medium, transform: [{ rotate: '10deg' }] },
    previewCircle: { position: 'absolute', right: 72, top: 34, width: 44, height: 44, borderRadius: 22 },
    previewSurface: { position: 'absolute', left: 14, top: 18, width: 150, height: 82, borderRadius: radius.medium, padding: spacing.sm },
    previewLineLong: { width: 94, height: 8, borderRadius: 4 },
    previewLineShort: { width: 68, height: 6, borderRadius: 3, marginTop: spacing.xs },
    previewButton: { alignItems: 'center', justifyContent: 'center', width: 70, height: 26, borderRadius: radius.pill, marginTop: spacing.sm },
    previewButtonText: { ...typography.micro, fontWeight: '900' },
  });
}
