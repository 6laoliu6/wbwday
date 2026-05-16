import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import {
  clearNewsApiKey,
  getNewsApiKey,
  setNewsApiKey,
} from '@/services/newsService';
import {
  fetchWeatherByCoords,
  getCachedWeather,
  getCurrentLocation,
  getLocationPermission,
  requestLocationPermission,
  saveCachedWeather,
} from '@/services/weatherService';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { WeatherSnapshot } from '@/types';
import {
  getSpeechRecognitionPermissions,
  isSpeechRecognitionAvailable,
  requestSpeechRecognitionPermissions,
} from '@/utils/speechRecognition';
import {
  hapticError,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
} from '@/utils/haptics';

type PermissionSnapshot = {
  canAskAgain?: boolean;
  granted: boolean;
  status: string;
};

function formatPermissionStatus(permission?: PermissionSnapshot): string {
  if (!permission) return '未检查';
  if (permission.granted) return '已允许';
  if (permission.canAskAgain === false) return '已拒绝，需要去系统设置开启';
  if (permission.status === 'undetermined') return '未询问';
  return '未允许';
}

function formatWeatherSnapshot(weather?: WeatherSnapshot): string {
  if (!weather) return '暂无缓存';
  const temperature = typeof weather.temperature === 'number' ? `${Math.round(weather.temperature)}°` : '--';
  const label = weather.weatherLabel ?? '天气普通';
  return `${label} ${temperature}`;
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [speechPermission, setSpeechPermission] = useState<PermissionSnapshot | undefined>();
  const [locationPermission, setLocationPermission] = useState<PermissionSnapshot | undefined>();
  const [cachedWeather, setCachedWeather] = useState<WeatherSnapshot | undefined>();
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);
  const [newsKeyInput, setNewsKeyInput] = useState('');
  const [newsKeyConfigured, setNewsKeyConfigured] = useState(false);
  const [savingNewsKey, setSavingNewsKey] = useState(false);

  const loadSettings = useCallback(async () => {
    setSpeechAvailable(isSpeechRecognitionAvailable());

    try {
      const nextSpeechPermission = await getSpeechRecognitionPermissions();
      setSpeechPermission({
        canAskAgain: nextSpeechPermission.canAskAgain,
        granted: nextSpeechPermission.granted,
        status: String(nextSpeechPermission.status),
      });
    } catch {
      setSpeechPermission({ canAskAgain: false, granted: false, status: 'unavailable' });
    }

    try {
      const nextLocationPermission = await getLocationPermission();
      setLocationPermission({
        canAskAgain: nextLocationPermission.canAskAgain,
        granted: nextLocationPermission.granted,
        status: String(nextLocationPermission.status),
      });
    } catch {
      setLocationPermission({ canAskAgain: false, granted: false, status: 'unavailable' });
    }

    const [weather, newsKey] = await Promise.all([getCachedWeather(), getNewsApiKey()]);
    setCachedWeather(weather);
    setNewsKeyInput(newsKey ?? '');
    setNewsKeyConfigured(Boolean(newsKey));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  const checkSpeechPermission = useCallback(async () => {
    if (!speechAvailable) {
      void hapticWarning();
      Alert.alert('语音输入不可用', '当前环境没有可用的语音识别服务，可以继续使用文字输入。');
      return;
    }

    try {
      void hapticSelection();
      const nextPermission = await requestSpeechRecognitionPermissions();
      setSpeechPermission({
        canAskAgain: nextPermission.canAskAgain,
        granted: nextPermission.granted,
        status: String(nextPermission.status),
      });

      if (nextPermission.granted) {
        void hapticSuccess();
      } else {
        void hapticWarning();
        Alert.alert('语音权限未开启', '可以继续使用文字输入。需要语音时，请在系统设置中允许麦克风和语音识别。');
      }
    } catch {
      void hapticError();
      Alert.alert('语音权限检查失败', '当前环境暂时不能检查语音权限。');
    }
  }, [speechAvailable]);

  const requestWeatherPermission = useCallback(async () => {
    try {
      void hapticSelection();
      const nextPermission = await requestLocationPermission();
      setLocationPermission({
        canAskAgain: nextPermission.canAskAgain,
        granted: nextPermission.granted,
        status: String(nextPermission.status),
      });

      if (nextPermission.granted) {
        void hapticSuccess();
      } else {
        void hapticWarning();
        Alert.alert('定位未开启', '首页会使用缓存或温和占位，不会反复弹权限。');
      }
    } catch {
      void hapticError();
      Alert.alert('定位权限检查失败', '当前环境暂时不能检查定位权限。');
    }
  }, []);

  const refreshWeather = useCallback(async () => {
    setWeatherRefreshing(true);

    try {
      let permission = await getLocationPermission();
      if (!permission.granted) {
        permission = await requestLocationPermission();
        setLocationPermission({
          canAskAgain: permission.canAskAgain,
          granted: permission.granted,
          status: String(permission.status),
        });
      }

      if (!permission.granted) {
        void hapticWarning();
        Alert.alert('定位未开启', '天气刷新需要当前位置。');
        return;
      }

      const location = await getCurrentLocation();
      const weather = await fetchWeatherByCoords(location.coords.latitude, location.coords.longitude);
      await saveCachedWeather(weather);
      setCachedWeather(weather);
      void hapticSuccess();
    } catch {
      void hapticError();
      Alert.alert('天气刷新失败', '会继续使用首页缓存或占位。');
    } finally {
      setWeatherRefreshing(false);
    }
  }, []);

  const saveNewsKey = useCallback(async () => {
    const trimmed = newsKeyInput.trim();
    if (!trimmed) {
      void hapticWarning();
      Alert.alert('没有填写 Key', '如果暂时没有新闻 API Key，可以先保持未配置状态。');
      return;
    }

    setSavingNewsKey(true);
    try {
      await setNewsApiKey(trimmed);
      setNewsKeyConfigured(true);
      setNewsKeyInput(trimmed);
      void hapticSuccess();
      Alert.alert('已保存', '新闻 Key 已保存在本机。');
    } catch {
      void hapticError();
      Alert.alert('保存失败', '新闻 Key 没有保存成功，请稍后再试。');
    } finally {
      setSavingNewsKey(false);
    }
  }, [newsKeyInput]);

  const clearNewsKey = useCallback(async () => {
    setSavingNewsKey(true);
    try {
      await clearNewsApiKey();
      setNewsKeyConfigured(false);
      setNewsKeyInput('');
      void hapticSuccess();
    } catch {
      void hapticError();
      Alert.alert('清除失败', '新闻 Key 没有清除成功，请稍后再试。');
    } finally {
      setSavingNewsKey(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.title}>设置</Text>
          <Text style={styles.subtitle}>只管理本机能力，不增加账号和云端流程。</Text>
        </View>

        <SettingCard
          actionLabel={speechAvailable ? '检查权限' : '不可用'}
          disabled={!speechAvailable}
          footnote="真实语音识别需要原生能力；不可用时，规划、记账和三餐仍保留文字输入。"
          label="语音输入"
          onAction={checkSpeechPermission}
          status={speechAvailable ? formatPermissionStatus(speechPermission) : '当前环境不可用'}
          title="麦克风与语音识别"
        />

        <SettingCard
          actionLabel="请求定位"
          footnote="天气使用 Open-Meteo，不需要 API Key。拒绝定位后，首页只显示缓存或占位。"
          label="天气"
          onAction={requestWeatherPermission}
          secondaryActionLabel={weatherRefreshing ? '刷新中' : '刷新天气'}
          secondaryDisabled={weatherRefreshing}
          onSecondaryAction={refreshWeather}
          status={formatPermissionStatus(locationPermission)}
          title={formatWeatherSnapshot(cachedWeather)}
        />

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardCopy}>
              <Text style={styles.kicker}>新闻</Text>
              <Text style={styles.cardTitle}>{newsKeyConfigured ? '已配置 API Key' : '未配置 API Key'}</Text>
              <Text style={styles.cardBody}>
                新闻使用 GNews。Key 保存在本机；客户端直连会暴露在安装包里，只适合个人自用。
              </Text>
            </View>
          </View>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setNewsKeyInput}
            placeholder="填写 GNews API Key"
            placeholderTextColor={theme.textMuted}
            style={styles.input}
            value={newsKeyInput}
          />

          <View style={styles.buttonRow}>
            <PrimaryButton disabled={savingNewsKey} onPress={saveNewsKey} variant="soft">
              保存 Key
            </PrimaryButton>
            <PrimaryButton disabled={savingNewsKey || !newsKeyConfigured} onPress={clearNewsKey} variant="ghost">
              清除 Key
            </PrimaryButton>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingCard({
  actionLabel,
  disabled,
  footnote,
  label,
  onAction,
  onSecondaryAction,
  secondaryActionLabel,
  secondaryDisabled,
  status,
  title,
}: {
  actionLabel: string;
  disabled?: boolean;
  footnote: string;
  label: string;
  onAction: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  secondaryDisabled?: boolean;
  status: string;
  title: string;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardCopy}>
          <Text style={styles.kicker}>{label}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardBody}>{footnote}</Text>
        </View>
        <View style={styles.badge}>
          <Text numberOfLines={2} style={styles.badgeText}>
            {status}
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <PrimaryButton disabled={disabled} onPress={onAction} variant="soft">
          {actionLabel}
        </PrimaryButton>
        {onSecondaryAction && secondaryActionLabel ? (
          <PrimaryButton disabled={secondaryDisabled} onPress={onSecondaryAction} variant="ghost">
            {secondaryActionLabel}
          </PrimaryButton>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      gap: spacing.md,
      padding: spacing.lg,
      paddingBottom: spacing.giant,
    },
    hero: {
      borderRadius: radius.xlarge,
      backgroundColor: theme.surface,
      padding: spacing.xl,
    },
    title: {
      ...typography.title,
      color: theme.text,
    },
    subtitle: {
      ...typography.body,
      color: theme.textMuted,
      marginTop: spacing.xs,
    },
    card: {
      borderColor: theme.border,
      borderRadius: radius.large,
      borderWidth: 1,
      backgroundColor: theme.surface,
      gap: spacing.md,
      padding: spacing.md,
    },
    cardHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    cardCopy: {
      flex: 1,
      minWidth: 0,
    },
    kicker: {
      ...typography.micro,
      color: theme.primary,
      fontWeight: '900',
      marginBottom: spacing.xxs,
    },
    cardTitle: {
      ...typography.cardTitle,
      color: theme.text,
      fontWeight: '900',
    },
    cardBody: {
      ...typography.caption,
      color: theme.textMuted,
      lineHeight: 18,
      marginTop: spacing.xs,
    },
    badge: {
      alignItems: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.surfaceAlt,
      justifyContent: 'center',
      maxWidth: 108,
      minHeight: 36,
      paddingHorizontal: spacing.sm,
    },
    badgeText: {
      ...typography.micro,
      color: theme.primary,
      fontWeight: '900',
      textAlign: 'center',
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    input: {
      ...typography.body,
      borderColor: theme.border,
      borderRadius: radius.medium,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
      color: theme.text,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
  });
}
