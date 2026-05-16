import { router, Stack, type Href, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, ThemeProvider, typography, type AppTheme, useTheme } from '@/theme';
import { hapticSelection } from '@/utils/haptics';

const tabs: Array<{ href: string; label: string; mark: string; match: (pathname: string) => boolean }> = [
  { href: '/', label: '今日', mark: '今', match: (pathname) => pathname === '/' },
  { href: '/goals', label: 'Goals', mark: 'G', match: (pathname) => pathname === '/goals' },
  { href: '/ledger', label: '记账', mark: '账', match: (pathname) => pathname === '/ledger' },
  { href: '/meals', label: '三餐', mark: '餐', match: (pathname) => pathname === '/meals' },
  { href: '/review', label: '复盘', mark: '盘', match: (pathname) => pathname.startsWith('/review') },
];

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedRootLayout />
    </ThemeProvider>
  );
}

function ThemedRootLayout() {
  const { theme } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: theme.background },
              headerShadowVisible: false,
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '800' },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'WBWday' }} />
            <Stack.Screen name="plan" options={{ title: '晨间规划' }} />
            <Stack.Screen name="settings" options={{ title: '设置' }} />
            <Stack.Screen name="theme" options={{ title: '外观主题' }} />
            <Stack.Screen name="goals/index" options={{ title: 'Goals' }} />
            <Stack.Screen name="goals/new" options={{ title: '新建 Goal' }} />
            <Stack.Screen name="goals/[id]" options={{ title: 'Goal' }} />
            <Stack.Screen name="goals/[id]/import-weekly" options={{ title: '导入周计划' }} />
            <Stack.Screen name="ledger/index" options={{ title: '账本' }} />
            <Stack.Screen name="ledger/new" options={{ title: '记一笔' }} />
            <Stack.Screen name="meals/index" options={{ title: '今日三餐' }} />
            <Stack.Screen name="meals/edit" options={{ title: '记录一餐' }} />
            <Stack.Screen name="focus/[taskId]" options={{ title: '专注训练' }} />
            <Stack.Screen name="proof/[taskId]" options={{ title: '拍照还愿' }} />
            <Stack.Screen name="review" options={{ title: '晚间复盘' }} />
            <Stack.Screen name="review/[date]" options={{ title: '晚间复盘' }} />
            <Stack.Screen name="task/new" options={{ title: '添加任务', presentation: 'card' }} />
            <Stack.Screen name="task/[id]" options={{ title: '任务详情' }} />
            <Stack.Screen name="history" options={{ title: '历史记录' }} />
          </Stack>
        </View>
        <BottomNav />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = createBottomNavStyles(theme);
  const activeTab = tabs.find((tab) => tab.match(pathname));

  if (!activeTab) return null;

  return (
    <View style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const active = tab.href === activeTab.href;
          return (
            <Pressable
              accessibilityRole="button"
              key={tab.label}
              onPress={() => {
                if (active) return;
                void hapticSelection();
                router.replace(tab.href as Href);
              }}
              style={({ pressed }) => [styles.item, pressed ? styles.pressed : undefined]}
            >
              <View style={[styles.mark, active ? styles.markActive : undefined]}>
                <Text style={[styles.markText, active ? styles.markTextActive : undefined]}>{tab.mark}</Text>
              </View>
              <Text numberOfLines={1} style={[styles.label, active ? styles.labelActive : undefined]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createBottomNavStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      borderTopColor: theme.border,
      borderTopWidth: 1,
      backgroundColor: theme.surface,
    },
    bar: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: spacing.xs,
    },
    item: {
      flex: 1,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xxs,
    },
    pressed: {
      opacity: 0.72,
    },
    mark: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.surfaceAlt,
    },
    markActive: {
      backgroundColor: theme.primary,
    },
    markText: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: '900',
      includeFontPadding: false,
      lineHeight: 16,
    },
    markTextActive: {
      color: theme.textOnPrimary,
    },
    label: {
      ...typography.micro,
      color: theme.textMuted,
      fontWeight: '900',
      includeFontPadding: false,
      lineHeight: 13,
      textAlign: 'center',
    },
    labelActive: {
      color: theme.primary,
    },
  });
}
