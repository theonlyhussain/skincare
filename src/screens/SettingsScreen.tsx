import React, { useCallback, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import type { TabScreenProps } from '../navigation';
import { getApiKey, setApiKey, clearApiKey, AVAILABLE_MODELS } from '../ai/client';
import {
  getBudget,
  setBudget,
  getModel,
  setModel,
  getGoals,
  setGoals,
  GOAL_OPTIONS,
  type GoalId,
} from '../db/settings';
import { exportAllData, deleteAllData } from '../utils/exportData';
import { colors, spacing, typography } from '../theme';
import { Screen, Card, Button, TextField, SectionTitle, Chip, Badge } from '../components/ui';

type Props = TabScreenProps<'SettingsTab'>;

export default function SettingsScreen(_props: Props) {
  const [key, setKey] = useState('');
  const [keySet, setKeySet] = useState(false);
  const [model, setModelName] = useState('glm-4v-flash');
  const [budget, setBudgetValue] = useState('');
  const [goals, setGoalsState] = useState<GoalId[]>([]);
  const [busy, setBusy] = useState(false);
  // Mirrors the goals state synchronously so toggles never write stale values.
  const goalsRef = useRef<GoalId[]>([]);

  const load = useCallback(async () => {
    const [storedKey, storedBudget, storedModel, storedGoals] = await Promise.all([
      getApiKey(),
      getBudget(),
      getModel(),
      getGoals(),
    ]);
    setKeySet(!!storedKey);
    setBudgetValue(storedBudget != null ? String(storedBudget) : '');
    setModelName(storedModel);
    goalsRef.current = storedGoals;
    setGoalsState(storedGoals);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const saveKey = async () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await setApiKey(trimmed);
      setKey('');
      setKeySet(true);
    } finally {
      setBusy(false);
    }
  };

  const removeKey = () => {
    Alert.alert('Remove API key?', 'You can add a new one anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await clearApiKey(); setKeySet(false); } },
    ]);
  };

  const saveBudget = async () => {
    const trimmed = budget.trim();
    const n = trimmed === '' ? null : Number(trimmed);
    await setBudget(n !== null && Number.isFinite(n) ? n : null);
    setBudgetValue(n !== null && Number.isFinite(n) ? String(n) : '');
  };

  const toggleGoal = (id: GoalId) => {
    const current = goalsRef.current;
    const next = current.includes(id) ? current.filter((g) => g !== id) : [...current, id];
    goalsRef.current = next;
    setGoalsState(next);
    setGoals(next);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete all data?',
      'This permanently removes every skin check, product, habit entry, and setting from this device. Photos are deleted too. Export first if you want a backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData();
            load();
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.sub}>Everything stays on your device. You bring your own AI key.</Text>

      {/* API key */}
      <SectionTitle title="AI provider" right={<Badge text={keySet ? 'Key set' : 'No key'} color={keySet ? colors.scoreHigh : colors.warn} />} />
      <Card style={styles.card}>
        <Text style={styles.cardHint}>
          SkinCare calls the GLM vision model with your own key from BigModel (Zhipu). It's stored in the device's secure storage.
        </Text>
        {keySet ? (
          <View style={styles.keyRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.scoreHigh} />
            <Text style={styles.keyState}>API key is configured</Text>
            <Button title="Replace" variant="soft" small onPress={() => setKeySet(false)} />
            <Button title="Remove" variant="ghost" small onPress={removeKey} />
          </View>
        ) : null}
        {!keySet || key.length > 0 ? (
          <TextField
            label="API key"
            value={key}
            onChangeText={setKey}
            placeholder="Paste your GLM API key"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        ) : null}
        {key.trim() ? <Button title={busy ? 'Saving…' : 'Save key'} onPress={saveKey} loading={busy} style={{ marginTop: spacing.sm }} /> : null}
        <Button
          title="Get a free API key at open.bigmodel.cn"
          variant="ghost"
          small
          icon={<Ionicons name="open-outline" size={14} color={colors.primaryDark} />}
          onPress={() => Linking.openURL('https://open.bigmodel.cn').catch(() => {})}
        />
      </Card>

      {/* Model */}
      <SectionTitle title="Vision model" />
      <Card style={styles.card}>
        <View style={styles.modelRow}>
          {AVAILABLE_MODELS.map((m) => (
            <View key={m.id} style={{ flex: 1 }}>
              <Chip
                label={m.label}
                active={model === m.id}
                onPress={() => { setModelName(m.id); setModel(m.id); }}
              />
              <Text style={styles.modelNote}>{m.note}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Budget */}
      <SectionTitle title="Shelf budget" />
      <Card style={styles.card}>
        <View style={styles.budgetRow}>
          <TextField
            label="Monthly budget (optional)"
            value={budget}
            onChangeText={setBudgetValue}
            placeholder="e.g. 60"
            keyboardType="decimal-pad"
            style={{ flex: 1 }}
          />
          <Button title="Save" variant="secondary" small onPress={saveBudget} />
        </View>
        <Text style={styles.cardHint}>Used by the Shelf to show how much of your budget is spent, and to ground product recommendations.</Text>
      </Card>

      {/* Goals */}
      <SectionTitle title="Ingredient goals" />
      <Card style={styles.card}>
        <Text style={styles.cardHint}>What are you trying to add to your routine? Recommendations in Chat are grounded in these goals, your existing shelf, and your budget.</Text>
        <View style={styles.goalGrid}>
          {GOAL_OPTIONS.map((g) => (
            <View key={g.id} style={styles.goalItem}>
              <Chip
                label={g.label}
                active={goals.includes(g.id)}
                onPress={() => toggleGoal(g.id)}
              />
              <Text style={styles.goalNote}>{g.note}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Data */}
      <SectionTitle title="Your data" />
      <Card style={styles.card}>
        <View style={styles.dataRow}>
          <Button title="Export data" variant="secondary" icon={<Ionicons name="download-outline" size={16} color={colors.primaryDark} />} onPress={() => { exportAllData().catch((e) => Alert.alert('Export failed', e?.message ?? 'Try again.')); }} />
          <Button title="Delete all" variant="danger" icon={<Ionicons name="trash-outline" size={16} color={colors.white} />} onPress={confirmDelete} />
        </View>
        <Text style={styles.cardHint}>Exports a JSON file with every check, product, and habit entry.</Text>
      </Card>

      <Text style={styles.footer}>SkinCare v{Constants.expoConfig?.version ?? '1.0.0'} · local-first · no ads · no accounts</Text>
      <Text style={styles.footerSub}>
        SkinCare tracks visible skin metrics and educates — it does not diagnose. For medical concerns, see a dermatologist.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  sub: { ...typography.body, color: colors.textMuted, marginTop: 4, lineHeight: 20 },
  card: { gap: spacing.md },
  cardHint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  keyState: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  modelRow: { flexDirection: 'row', gap: spacing.md },
  modelNote: { ...typography.caption, color: colors.textFaint, marginTop: 6 },
  budgetRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  goalGrid: { gap: spacing.md },
  goalItem: { gap: 4 },
  goalNote: { ...typography.caption, color: colors.textFaint, marginLeft: 2 },
  dataRow: { flexDirection: 'row', gap: spacing.md },
  footer: { ...typography.caption, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xxl },
  footerSub: { ...typography.caption, color: colors.textFaint, textAlign: 'center', marginTop: spacing.sm, lineHeight: 16 },
});
