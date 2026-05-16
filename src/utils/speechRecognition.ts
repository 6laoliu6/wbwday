import { Platform } from 'react-native';
import { PermissionStatus } from 'expo-modules-core';

import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionNativeEventMap,
  ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition';

type SpeechRecognitionPackage = typeof import('expo-speech-recognition');
type SpeechRecognitionModule = SpeechRecognitionPackage['ExpoSpeechRecognitionModule'];
type SpeechRecognitionPermissionResponse = Awaited<ReturnType<SpeechRecognitionModule['requestPermissionsAsync']>>;
type SpeechEventName = keyof ExpoSpeechRecognitionNativeEventMap;
type SpeechEventListener<T extends SpeechEventName> = (event: ExpoSpeechRecognitionNativeEventMap[T]) => void;
type SpeechListenerSubscription = { remove: () => void };

function loadSpeechRecognitionPackage(): SpeechRecognitionPackage | undefined {
  try {
    return require('expo-speech-recognition') as SpeechRecognitionPackage;
  } catch {
    return undefined;
  }
}

function getSpeechRecognitionModule() {
  return loadSpeechRecognitionPackage()?.ExpoSpeechRecognitionModule;
}

export function isSpeechRecognitionAvailable(): boolean {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) return false;

  try {
    return speechRecognition.isRecognitionAvailable();
  } catch {
    return Platform.OS === 'web';
  }
}

export async function requestSpeechRecognitionPermissions(): Promise<SpeechRecognitionPermissionResponse> {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) {
    return {
      canAskAgain: false,
      expires: 'never',
      granted: false,
      status: PermissionStatus.DENIED,
    };
  }

  return speechRecognition.requestPermissionsAsync();
}

export async function getSpeechRecognitionPermissions(): Promise<SpeechRecognitionPermissionResponse> {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) {
    return {
      canAskAgain: false,
      expires: 'never',
      granted: false,
      status: PermissionStatus.DENIED,
    };
  }

  return speechRecognition.getPermissionsAsync();
}

export function startSpeechRecognition(options: ExpoSpeechRecognitionOptions = {}): void {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) {
    throw new Error('SPEECH_RECOGNITION_UNAVAILABLE');
  }

  speechRecognition.start({
    lang: 'zh-CN',
    interimResults: true,
    continuous: false,
    ...options,
  });
}

export function stopSpeechRecognition(): void {
  getSpeechRecognitionModule()?.stop();
}

export function abortSpeechRecognition(): void {
  getSpeechRecognitionModule()?.abort();
}

export function addSpeechRecognitionListener<T extends SpeechEventName>(
  eventName: T,
  listener: SpeechEventListener<T>,
): SpeechListenerSubscription | undefined {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) return undefined;

  return speechRecognition.addListener(eventName, listener as never);
}

export function getSpeechRecognitionErrorMessage(error?: ExpoSpeechRecognitionErrorEvent): string {
  if (!error) return '语音识别暂时不可用，请先使用文字输入。';
  if (error.error === 'not-allowed') return '没有麦克风或语音识别权限，可以继续使用文字输入。';
  if (error.error === 'service-not-allowed') return '当前设备没有可用的语音识别服务，可以继续使用文字输入。';
  if (error.error === 'language-not-supported') return '当前语音服务不支持中文识别，可以继续使用文字输入。';
  if (error.error === 'network') return '语音识别需要网络，但当前网络不可用。';
  if (error.error === 'no-speech' || error.error === 'speech-timeout') return '没有听到有效内容，可以再试一次。';
  if (error.error === 'busy') return '语音识别正在被占用，请稍后再试。';
  if (error.error === 'aborted') return '语音输入已取消。';
  return error.message || '语音识别暂时不可用，请先使用文字输入。';
}
