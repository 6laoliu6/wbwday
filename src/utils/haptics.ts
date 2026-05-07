import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

async function runHaptic(action: () => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await action();
  } catch {
    // Haptics are optional. Unsupported devices should not affect core flows.
  }
}

export function hapticLight(): Promise<void> {
  return runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticMedium(): Promise<void> {
  return runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticSelection(): Promise<void> {
  return runHaptic(() => Haptics.selectionAsync());
}

export function hapticSuccess(): Promise<void> {
  return runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function hapticWarning(): Promise<void> {
  return runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function hapticError(): Promise<void> {
  return runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
