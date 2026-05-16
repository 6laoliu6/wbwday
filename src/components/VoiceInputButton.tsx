import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import {
  abortSpeechRecognition,
  addSpeechRecognitionListener,
  getSpeechRecognitionErrorMessage,
  isSpeechRecognitionAvailable,
  requestSpeechRecognitionPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
} from '@/utils/speechRecognition';
import { hapticError, hapticSelection, hapticSuccess } from '@/utils/haptics';

type VoiceInputButtonProps = {
  disabled?: boolean;
  label?: string;
  listeningLabel?: string;
  onTranscript: (text: string) => void;
};

export function VoiceInputButton({
  disabled = false,
  label = '语音输入',
  listeningLabel = '停止',
  onTranscript,
}: VoiceInputButtonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const activeRef = useRef(false);
  const lastAppliedRef = useRef('');
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');

  const applyTranscript = useCallback(
    (text: string) => {
      const normalized = text.trim();
      if (!normalized || normalized === lastAppliedRef.current) return;
      lastAppliedRef.current = normalized;
      onTranscript(normalized);
      void hapticSuccess();
    },
    [onTranscript],
  );

  useEffect(() => {
    const startSubscription = addSpeechRecognitionListener('start', () => {
      if (!activeRef.current) return;
      setListening(true);
      setMessage('正在听');
    });
    const endSubscription = addSpeechRecognitionListener('end', () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      setListening(false);
      setMessage((current) => current || '语音输入已结束');
    });
    const resultSubscription = addSpeechRecognitionListener('result', (event) => {
      if (!activeRef.current) return;
      const nextTranscript = event.results[0]?.transcript?.trim() ?? '';
      if (!nextTranscript) return;
      setTranscript(nextTranscript);
      setMessage(event.isFinal ? '已识别' : '正在识别');
      if (event.isFinal) {
        applyTranscript(nextTranscript);
      }
    });
    const errorSubscription = addSpeechRecognitionListener('error', (event) => {
      if (!activeRef.current && event.error === 'aborted') return;
      activeRef.current = false;
      setListening(false);
      const nextMessage = getSpeechRecognitionErrorMessage(event);
      setMessage(nextMessage);
      if (event.error !== 'aborted') {
        void hapticError();
        Alert.alert('语音输入不可用', nextMessage);
      }
    });

    return () => {
      activeRef.current = false;
      startSubscription?.remove();
      endSubscription?.remove();
      resultSubscription?.remove();
      errorSubscription?.remove();
      abortSpeechRecognition();
    };
  }, [applyTranscript]);

  const startListening = useCallback(async () => {
    if (disabled) return;
    if (!isSpeechRecognitionAvailable()) {
      const unavailableMessage = '当前设备没有可用的语音识别服务，可以继续使用文字输入。';
      setMessage(unavailableMessage);
      void hapticError();
      Alert.alert('语音输入不可用', unavailableMessage);
      return;
    }

    const permission = await requestSpeechRecognitionPermissions();
    if (!permission.granted) {
      const deniedMessage = '没有麦克风或语音识别权限，可以继续使用文字输入。';
      setMessage(deniedMessage);
      void hapticError();
      Alert.alert('需要权限', deniedMessage);
      return;
    }

    try {
      activeRef.current = true;
      lastAppliedRef.current = '';
      setTranscript('');
      setMessage('正在听');
      void hapticSelection();
      startSpeechRecognition({
        lang: 'zh-CN',
        interimResults: true,
        continuous: false,
      });
    } catch {
      activeRef.current = false;
      setListening(false);
      const nextMessage = '语音识别启动失败，可以继续使用文字输入。';
      setMessage(nextMessage);
      void hapticError();
      Alert.alert('语音输入不可用', nextMessage);
    }
  }, [disabled]);

  const stopListening = useCallback(() => {
    if (!listening) return;
    void hapticSelection();
    setMessage('正在整理识别结果');
    stopSpeechRecognition();
  }, [listening]);

  return (
    <View style={styles.wrap}>
      <PrimaryButton disabled={disabled} onPress={listening ? stopListening : startListening} variant="soft">
        {listening ? listeningLabel : label}
      </PrimaryButton>
      {listening || transcript || message ? (
        <View style={[styles.panel, listening ? styles.panelActive : undefined]}>
          <Text style={styles.status}>{message || (listening ? '正在听' : '语音输入')}</Text>
          {transcript ? <Text style={styles.transcript}>{transcript}</Text> : null}
          {transcript ? (
            <PrimaryButton onPress={() => applyTranscript(transcript)} variant="quiet">
              使用这段文字
            </PrimaryButton>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.xs,
    },
    panel: {
      borderColor: theme.border,
      borderRadius: radius.large,
      borderWidth: 1,
      backgroundColor: theme.surface,
      padding: spacing.sm,
    },
    panelActive: {
      borderColor: theme.primary,
    },
    status: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: '900',
      marginBottom: spacing.xxs,
    },
    transcript: {
      ...typography.body,
      color: theme.text,
      lineHeight: 22,
    },
  });
}
