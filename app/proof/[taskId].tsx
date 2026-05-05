import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/theme';
import { completionStatusLabels } from '@/constants/taskText';
import { deleteProofImage, saveProofImage } from '@/storage/imageStorage';
import { getLatestCompletionProofByTaskId, saveCompletionProof } from '@/storage/proofRepository';
import { getTaskById } from '@/storage/taskRepository';
import type { CompletionProof, CompletionStatus, Task } from '@/types';
import { formatFocusDuration, getTaskFocusSeconds } from '@/utils/time';

type SelectedImage = {
  uri: string;
  isPersisted: boolean;
};

const completionStatusOptions: CompletionStatus[] = ['completed', 'partial', 'exceeded'];

export default function ProofScreen() {
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = params.taskId;
  const [task, setTask] = useState<Task | undefined>();
  const [existingProof, setExistingProof] = useState<CompletionProof | undefined>();
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('completed');
  const [actualResult, setActualResult] = useState('');
  const [note, setNote] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    const [nextTask, nextProof] = await Promise.all([
      getTaskById(taskId),
      getLatestCompletionProofByTaskId(taskId),
    ]);

    setTask(nextTask);
    setExistingProof(nextProof);

    if (nextProof) {
      setCompletionStatus(nextProof.completionStatus);
      setActualResult(nextProof.actualResult ?? '');
      setNote(nextProof.note ?? nextProof.reflection ?? '');
      const imageUri = nextProof.thumbnailUri ?? nextProof.imageUri ?? nextProof.localUri;
      setSelectedImage(imageUri ? { uri: imageUri, isPersisted: true } : undefined);
    }

    setLoading(false);
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('需要相机权限才能拍照还愿。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    setSelectedImage({ uri: result.assets[0].uri, isPersisted: false });
  }, []);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);

    if (!permission.granted) {
      Alert.alert('需要相册权限才能选择还愿照片。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    setSelectedImage({ uri: result.assets[0].uri, isPersisted: false });
  }, []);

  const saveProof = useCallback(
    async (confirmedWithoutImage = false) => {
      if (!taskId || !task || saving) {
        return;
      }

      if (!selectedImage && !confirmedWithoutImage) {
        Alert.alert('没有照片也可以保存', '没有照片也可以保存，但拍照会更有仪式感。', [
          { text: '继续编辑', style: 'cancel' },
          { text: '仍然保存', onPress: () => void saveProof(true) },
        ]);
        return;
      }

      setSaving(true);

      try {
        let imageUri = selectedImage?.isPersisted ? existingProof?.imageUri : undefined;
        let thumbnailUri = selectedImage?.isPersisted ? existingProof?.thumbnailUri : undefined;

        if (selectedImage && !selectedImage.isPersisted) {
          const savedImage = await saveProofImage(taskId, selectedImage.uri);
          imageUri = savedImage.imageUri;
          thumbnailUri = savedImage.thumbnailUri;
        }

        const proof = await saveCompletionProof(
          taskId,
          {
            imageUri,
            thumbnailUri,
            completionStatus,
            actualResult,
            note,
          },
          existingProof?.id,
        );

        if (!selectedImage && existingProof?.imageUri) {
          await Promise.all([
            deleteProofImage(existingProof.imageUri),
            deleteProofImage(existingProof.thumbnailUri),
          ]);
        }

        if (selectedImage && !selectedImage.isPersisted && existingProof?.imageUri) {
          await Promise.all([
            deleteProofImage(existingProof.imageUri),
            deleteProofImage(existingProof.thumbnailUri),
          ]);
        }

        Alert.alert('还愿已保存。', undefined, [
          {
            text: '好',
            onPress: () => router.replace(`/task/${proof.taskId}` as Href),
          },
        ]);
      } catch {
        Alert.alert('保存失败', '图片或还愿记录没有保存成功，请稍后再试。');
        setSaving(false);
      }
    },
    [actualResult, completionStatus, existingProof, note, saving, selectedImage, task, taskId],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>没有找到这个任务</Text>
          <PrimaryButton onPress={() => router.replace('/')} variant="soft">
            返回今日首页
          </PrimaryButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.kicker}>兑现今天的承诺</Text>
          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.criteria}>完成标准：{task.completionCriteria}</Text>
          <Text style={styles.focusText}>累计专注 {formatFocusDuration(getTaskFocusSeconds(task))}</Text>

          <View style={styles.block}>
            <Text style={styles.label}>完成了吗？</Text>
            <View style={styles.statusRow}>
              {completionStatusOptions.map((status) => (
                <Pressable
                  accessibilityRole="button"
                  key={status}
                  onPress={() => setCompletionStatus(status)}
                  style={[
                    styles.statusButton,
                    completionStatus === status ? styles.statusButtonActive : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      completionStatus === status ? styles.statusButtonTextActive : undefined,
                    ]}
                  >
                    {completionStatusLabels[status]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>实际完成情况</Text>
            <TextInput
              multiline
              onChangeText={setActualResult}
              placeholder="例如：实际写了 1800 字"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.textArea]}
              value={actualResult}
            />
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>写一句给今天的自己</Text>
            <TextInput
              multiline
              onChangeText={setNote}
              placeholder="例如：虽然开始得晚，但还是完成了。"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.textArea]}
              value={note}
            />
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>给今天一个证明</Text>
            {selectedImage ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                <PrimaryButton onPress={() => setSelectedImage(undefined)} variant="ghost">
                  删除当前照片
                </PrimaryButton>
              </View>
            ) : (
              <View style={styles.photoEmpty}>
                <Text style={styles.photoEmptyText}>拍下这一刻，或者先只写下完成感想。</Text>
              </View>
            )}

            <View style={styles.photoActions}>
              <PrimaryButton onPress={takePhoto}>拍照</PrimaryButton>
              <PrimaryButton onPress={pickImage} variant="soft">
                从相册选择
              </PrimaryButton>
            </View>
          </View>

          <PrimaryButton disabled={saving} onPress={() => void saveProof()}>
            {saving ? '保存中' : '保存还愿'}
          </PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 44,
  },
  kicker: {
    color: colors.accentDark,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
    marginBottom: 10,
  },
  criteria: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  focusText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 18,
    marginTop: 8,
  },
  block: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    marginBottom: 14,
    padding: 16,
  },
  label: {
    color: colors.accentDark,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background,
  },
  statusButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  statusButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  statusButtonTextActive: {
    color: colors.surface,
  },
  input: {
    minHeight: 46,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  previewWrap: {
    gap: 12,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
  },
  photoEmpty: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 22,
  },
  photoEmptyText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
});
