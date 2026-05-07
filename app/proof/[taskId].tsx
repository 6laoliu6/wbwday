import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { completionStatusLabels } from '@/constants/taskText';
import { deleteProofImage, saveProofImage } from '@/storage/imageStorage';
import { getLatestCompletionProofByTaskId, saveCompletionProof } from '@/storage/proofRepository';
import { getTaskById } from '@/storage/taskRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { CompletionProof, CompletionStatus, Task } from '@/types';
import {
  hapticError,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
} from '@/utils/haptics';
import { formatFocusDuration, getTaskFocusSeconds } from '@/utils/time';

type SelectedImage = {
  uri: string;
  isPersisted: boolean;
};

const completionStatusOptions: CompletionStatus[] = ['completed', 'partial', 'exceeded'];

export default function ProofScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
    void hapticSelection();
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
    void hapticSelection();
  }, []);

  const removeSelectedImage = useCallback(() => {
    void hapticWarning();
    setSelectedImage(undefined);
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

        void hapticSuccess();
        Alert.alert('这一刻，收好啦', '还愿已保存。', [
          {
            text: '好',
            onPress: () => router.replace(`/task/${proof.taskId}` as Href),
          },
        ]);
      } catch {
        void hapticError();
        Alert.alert('保存失败', '图片或还愿记录没有保存成功，请稍后再试。');
        setSaving(false);
      }
    },
    [actualResult, completionStatus, existingProof, note, saving, selectedImage, task, taskId],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
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
          <View style={styles.hero}>
            <View style={styles.heroMark} />
            <Text style={styles.kicker}>给今天一个证明</Text>
            <Text style={styles.title}>{task.title}</Text>
            <Text style={styles.criteria}>完成标准：{task.completionCriteria}</Text>
            <Text style={styles.focusText}>累计专注 {formatFocusDuration(getTaskFocusSeconds(task))}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>完成了吗？</Text>
            <View style={styles.statusRow}>
              {completionStatusOptions.map((status) => {
                const isActive = completionStatus === status;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={status}
                    onPress={() => setCompletionStatus(status)}
                    style={({ pressed }) => [
                      styles.statusButton,
                      isActive ? styles.statusButtonActive : undefined,
                      pressed ? styles.pressed : undefined,
                    ]}
                  >
                    <Text style={[styles.statusButtonText, isActive ? styles.statusButtonTextActive : undefined]}>
                      {completionStatusLabels[status]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>实际完成情况</Text>
            <TextInput
              multiline
              onChangeText={setActualResult}
              placeholder="例如：实际写了 1800 字"
              placeholderTextColor={theme.textMuted}
              selectionColor={theme.primary}
              style={styles.input}
              textAlignVertical="top"
              value={actualResult}
            />
          </View>

          <View style={styles.journalBlock}>
            <Text style={styles.label}>写一句给今天的自己</Text>
            <TextInput
              multiline
              onChangeText={setNote}
              placeholder="例如：今天也有好好兑现。"
              placeholderTextColor={theme.textMuted}
              selectionColor={theme.primary}
              style={[styles.input, styles.journalInput]}
              textAlignVertical="top"
              value={note}
            />
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>拍下这一刻</Text>
            {selectedImage ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                <View style={styles.imageBadge}>
                  <Text style={styles.imageBadgeText}>PROOF</Text>
                </View>
                <PrimaryButton onPress={removeSelectedImage} variant="quiet">
                  删除当前照片
                </PrimaryButton>
              </View>
            ) : (
              <View style={styles.photoEmpty}>
                <View style={styles.photoDot} />
                <Text style={styles.photoEmptyTitle}>这里会成为今天的小封面</Text>
                <Text style={styles.photoEmptyText}>没有照片也可以保存，但拍照会更有仪式感。</Text>
              </View>
            )}

            <View style={styles.photoActions}>
              <View style={styles.photoActionItem}>
                <PrimaryButton onPress={takePhoto}>拍照</PrimaryButton>
              </View>
              <View style={styles.photoActionItem}>
                <PrimaryButton onPress={pickImage} variant="soft">
                  从相册选择
                </PrimaryButton>
              </View>
            </View>
          </View>

          <PrimaryButton disabled={saving} onPress={() => void saveProof()} size="large">
            {saving ? '保存中' : '保存还愿'}
          </PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboard: {
      flex: 1,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    hero: {
      overflow: 'hidden',
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderWidth: 1,
      backgroundColor: theme.surface,
      marginBottom: spacing.md,
      padding: spacing.xl,
    },
    heroMark: {
      position: 'absolute',
      right: -28,
      top: -36,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.accent,
      opacity: 0.72,
    },
    kicker: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: '900',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.title,
      color: theme.text,
      fontWeight: '900',
      lineHeight: 36,
      marginBottom: spacing.sm,
      maxWidth: '86%',
    },
    criteria: {
      ...typography.body,
      color: theme.textMuted,
      lineHeight: 22,
    },
    focusText: {
      ...typography.caption,
      alignSelf: 'flex-start',
      overflow: 'hidden',
      borderRadius: radius.pill,
      backgroundColor: theme.surfaceAlt,
      color: theme.primary,
      fontWeight: '900',
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    block: {
      borderColor: theme.border,
      borderRadius: radius.large,
      borderWidth: 1,
      backgroundColor: theme.surface,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    journalBlock: {
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    label: {
      ...typography.body,
      color: theme.text,
      fontWeight: '900',
      marginBottom: spacing.sm,
    },
    statusRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statusButton: {
      flex: 1,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: theme.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
      paddingHorizontal: spacing.sm,
    },
    statusButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    statusButtonText: {
      ...typography.caption,
      color: theme.text,
      fontWeight: '900',
    },
    statusButtonTextActive: {
      color: theme.textOnPrimary,
    },
    input: {
      minHeight: 104,
      borderColor: theme.border,
      borderRadius: radius.medium,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
      color: theme.text,
      fontSize: 16,
      lineHeight: 23,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    journalInput: {
      minHeight: 120,
      backgroundColor: theme.surface,
    },
    previewWrap: {
      overflow: 'hidden',
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
      gap: spacing.sm,
      padding: spacing.sm,
    },
    previewImage: {
      width: '100%',
      aspectRatio: 4 / 3,
      borderRadius: radius.large,
      backgroundColor: theme.surfaceAlt,
    },
    imageBadge: {
      position: 'absolute',
      left: spacing.lg,
      top: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: theme.accent,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    imageBadgeText: {
      ...typography.micro,
      color: theme.text,
      fontWeight: '900',
    },
    photoEmpty: {
      alignItems: 'center',
      borderColor: theme.border,
      borderRadius: radius.xlarge,
      borderStyle: 'dashed',
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
      padding: spacing.xl,
    },
    photoDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.accent,
      marginBottom: spacing.sm,
    },
    photoEmptyTitle: {
      ...typography.cardTitle,
      color: theme.text,
      fontWeight: '900',
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    photoEmptyText: {
      ...typography.body,
      color: theme.textMuted,
      lineHeight: 22,
      textAlign: 'center',
    },
    photoActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    photoActionItem: {
      flex: 1,
    },
    pressed: {
      opacity: 0.84,
      transform: [{ scale: 0.985 }],
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    emptyTitle: {
      ...typography.section,
      color: theme.text,
      fontWeight: '900',
      marginBottom: spacing.md,
      textAlign: 'center',
    },
  });
}
