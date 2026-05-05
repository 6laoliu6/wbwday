import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerTitleStyle: {
            fontWeight: '800',
          },
        }}
      >
        <Stack.Screen name="index" options={{ title: '今日立愿' }} />
        <Stack.Screen name="plan" options={{ title: '晨间规划' }} />
        <Stack.Screen name="focus/[taskId]" options={{ title: '专注训练' }} />
        <Stack.Screen name="proof/[taskId]" options={{ title: '拍照还愿' }} />
        <Stack.Screen name="task/new" options={{ title: '添加任务', presentation: 'card' }} />
        <Stack.Screen name="task/[id]" options={{ title: '任务详情' }} />
        <Stack.Screen name="history" options={{ title: '历史记录' }} />
      </Stack>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}
