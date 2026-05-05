import { Alert } from 'react-native';

import { PrimaryButton } from './PrimaryButton';

export function VoiceInputButton() {
  return (
    <PrimaryButton
      onPress={() => {
        Alert.alert('语音输入', '语音输入将在后续版本接入，现在请先使用文字输入。');
      }}
      variant="soft"
    >
      语音输入
    </PrimaryButton>
  );
}
