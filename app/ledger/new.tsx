import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedChip } from '@/components/ThemedChip';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { createLedgerEntry } from '@/storage/ledgerRepository';
import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { LedgerCategory, LedgerEntryType } from '@/types';
import { toDateKey } from '@/utils/date';
import { dateInputToDateKey, toDateInputValue } from '@/utils/dateInput';
import { hapticError, hapticSelection, hapticSuccess, hapticWarning } from '@/utils/haptics';
import { ledgerCategoryLabels } from '@/utils/ledgerStats';
import { parseLedgerText } from '@/utils/parseLedgerText';

const categories: LedgerCategory[] = ['food', 'transport', 'shopping', 'study', 'health', 'daily', 'salary', 'partTime', 'redPacket', 'refund', 'other'];

export default function NewLedgerEntryScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [type, setType] = useState<LedgerEntryType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<LedgerCategory>('other');
  const [date, setDate] = useState(toDateInputValue(toDateKey()));
  const [note, setNote] = useState('');
  const [rawText, setRawText] = useState('');
  const [saving, setSaving] = useState(false);

  const recognize = () => {
    const parsed = parseLedgerText(rawText);
    if (!parsed?.amount || !parsed.type || !parsed.category || !parsed.date) {
      void hapticWarning();
      Alert.alert('暂时没识别出来，可以手动填写。');
      return;
    }
    setType(parsed.type);
    setAmount(String(parsed.amount));
    setCategory(parsed.category);
    setDate(toDateInputValue(parsed.date));
    setNote(parsed.note ?? '');
    void hapticSelection();
  };

  const save = async () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      void hapticWarning();
      Alert.alert('金额要大于 0');
      return;
    }
    const normalizedDate = dateInputToDateKey(date);
    if (!normalizedDate) {
      void hapticWarning();
      Alert.alert('日期请使用 2026 08 27 这样的格式。');
      return;
    }

    setSaving(true);
    try {
      await createLedgerEntry({
        type,
        amount: numericAmount,
        category,
        categoryLabel: ledgerCategoryLabels[category],
        date: normalizedDate,
        note: note.trim() || undefined,
        source: rawText.trim() ? 'voice-text' : 'manual',
        rawText: rawText.trim() || undefined,
      });
      void hapticSuccess();
      router.back();
    } catch {
      void hapticError();
      Alert.alert('保存失败', '这笔账暂时没有保存成功。');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.kicker}>NEW ENTRY</Text>
            <Text style={styles.title}>记一笔</Text>
            <Text style={styles.subtitle}>先用文字模拟语音输入，后续可接真实语音识别。</Text>
          </View>

          <View style={styles.card}>
            <ThemedTextInput label="语音记账" onChangeText={setRawText} placeholder="例如：今天午饭花了18块" value={rawText} />
            <VoiceInputButton label="说一笔账" onTranscript={setRawText} />
            <PrimaryButton onPress={recognize} variant="soft">识别并填入</PrimaryButton>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>类型</Text>
            <View style={styles.row}>
              <ThemedChip active={type === 'expense'} label="支出" onPress={() => { setType('expense'); void hapticSelection(); }} style={styles.flexChip} tone="danger" />
              <ThemedChip active={type === 'income'} label="收入" onPress={() => { setType('income'); void hapticSelection(); }} style={styles.flexChip} tone="success" />
            </View>
            <ThemedTextInput keyboardType="decimal-pad" label="金额" onChangeText={setAmount} placeholder="18" value={amount} />
            <ThemedTextInput label="日期" onChangeText={setDate} placeholder="2026 08 27" value={date} />
            <Text style={styles.label}>分类</Text>
            <View style={styles.categoryGrid}>
              {categories.map((item) => (
                <ThemedChip active={category === item} key={item} label={ledgerCategoryLabels[item]} onPress={() => { setCategory(item); void hapticSelection(); }} tone="primary" />
              ))}
            </View>
            <ThemedTextInput label="备注" multiline onChangeText={setNote} placeholder="可选" value={note} />
          </View>

          <PrimaryButton disabled={saving} onPress={save} size="large">{saving ? '保存中' : '保存账单'}</PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    keyboard: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.md },
    hero: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.xl },
    kicker: { ...typography.micro, color: theme.primary, fontWeight: '900', marginBottom: spacing.xs },
    title: { ...typography.title, color: theme.text, fontWeight: '900' },
    subtitle: { ...typography.body, color: theme.textMuted, marginTop: spacing.xs },
    card: { borderColor: theme.border, borderRadius: radius.xlarge, borderWidth: 1, backgroundColor: theme.surface, padding: spacing.md, gap: spacing.sm },
    label: { ...typography.caption, color: theme.text, fontWeight: '900', marginBottom: spacing.xs },
    row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    flexChip: { flex: 1 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  });
}
