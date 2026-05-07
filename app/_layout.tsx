import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider, useTheme } from '@/theme';

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
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: '800',
          },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'WBWday' }} />
        <Stack.Screen name="plan" options={{ title: '晨间规划' }} />
        <Stack.Screen name="theme" options={{ title: '外观主题' }} />
        <Stack.Screen name="focus/[taskId]" options={{ title: '专注训练' }} />
        <Stack.Screen name="proof/[taskId]" options={{ title: '拍照还愿' }} />
        <Stack.Screen name="review" options={{ title: '晚间复盘' }} />
        <Stack.Screen name="review/[date]" options={{ title: '晚间复盘' }} />
        <Stack.Screen name="task/new" options={{ title: '添加任务', presentation: 'card' }} />
        <Stack.Screen name="task/[id]" options={{ title: '任务详情' }} />
        <Stack.Screen name="history" options={{ title: '历史记录' }} />
      </Stack>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}
