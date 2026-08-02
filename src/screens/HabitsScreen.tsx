import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { TabScreenProps } from '../navigation';
import { getHabitLog, upsertHabitLog, deleteHabitLog, getHabitLogs } from '../db/habits';
import { getSkinLogs } from '../db/skinLogs';
import { todayKey, formatDateKey, formatRelative } from '../utils/format';
import { colors, spacing, typography } from '../theme';
import { Screen, Card, Button, TextField, SectionTitle, Chip, EmptyState } from '../components/ui';
import type { HabitLog, SkinLog } from '../types';

type Props = TabScreenProps<'HabitsTab'>;

const DAILY_GOAL = 2000; // ml

export default function HabitsScreen(_props: Props) {
  const [today, setToday] = useState<HabitLog | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [skinLogs, setSkinLogs] = useState<SkinLog[]>([]);
  const [notes, setNotes] = useState('');
  const [dairy, setDairy] = useState(false);
  const [sugar, setSugar] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Source of truth for today's row; updated synchronously so rapid taps can't lose increments.
  const todayRef = useRef<HabitLog | null>(null);

  const load = useCallback(async () => {
    const [habit, allLogs, allSkin] = await Promise.all([getHabitLog(todayKey()), getHabitLogs(), getSkinLogs()]);
    todayRef.current = habit;
    setToday(habit);
    setLogs(allLogs);
    setSkinLogs(allSkin);
    setNotes(habit?.diet_notes ?? '');
    setDairy(habit?.dairy ?? false);
    setSugar(habit?.sugar ?? false);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const persist = (patch: Partial<HabitLog>) => {
    const current = todayRef.current;
    const next: HabitLog = {
      id: current?.id ?? 0,
      date: todayKey(),
      water_ml: patch.water_ml ?? current?.water_ml ?? 0,
      dairy: patch.dairy ?? current?.dairy ?? false,
      sugar: patch.sugar ?? current?.sugar ?? false,
      diet_notes: patch.diet_notes !== undefined ? patch.diet_notes : (current?.diet_notes ?? null),
    };
    todayRef.current = next;
    setToday(next);
    setDairy(next.dairy);
    setSugar(next.sugar);
    setNotes(next.diet_notes ?? '');
    upsertHabitLog({ date: next.date, water_ml: next.water_ml, dairy: next.dairy, sugar: next.sugar, diet_notes: next.diet_notes });
    return next;
  };

  const addWater = (ml: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    persist({ water_ml: (todayRef.current?.water_ml ?? 0) + ml });
    load();
  };

  const toggleDairy = () => {
    persist({ dairy: !(todayRef.current?.dairy ?? false) });
  };

  const toggleSugar = () => {
    persist({ sugar: !(todayRef.current?.sugar ?? false) });
  };

  const saveNotes = () => {
    persist({ diet_notes: notes });
  };

  // ---- pattern view (honest: correlation, not causation) ----
  const pattern = useMemo(() => {
    const scoreByDay = new Map(skinLogs.map((l) => [l.date, l.score]));
    const rows = logs
      .map((h) => ({ ...h, score: scoreByDay.get(h.date) }))
      .filter((r): r is HabitLog & { score: number } => r.score !== undefined);
    if (rows.length < 2) return null;

    const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);
    const withDairy = avg(rows.filter((r) => r.dairy).map((r) => r.score));
    const withoutDairy = avg(rows.filter((r) => !r.dairy).map((r) => r.score));
    const withSugar = avg(rows.filter((r) => r.sugar).map((r) => r.score));
    const withoutSugar = avg(rows.filter((r) => !r.sugar).map((r) => r.score));
    const hydrated = avg(rows.filter((r) => (r.water_ml ?? 0) >= 1500).map((r) => r.score));
    const lessHydrated = avg(rows.filter((r) => (r.water_ml ?? 0) < 1500).map((r) => r.score));
    return { withDairy, withoutDairy, withSugar, withoutSugar, hydrated, lessHydrated };
  }, [logs, skinLogs]);

  const waterPct = Math.min(100, Math.round(((today?.water_ml ?? 0) / DAILY_GOAL) * 100));

  return (
    <Screen>
      <Text style={styles.title}>Habits</Text>
      <Text style={styles.sub}>Small daily patterns, tracked honestly — no AI guesses about causation.</Text>

      {/* Today's log */}
      <SectionTitle title="Today" />
      <Card style={styles.todayCard}>
        <View style={styles.waterSection}>
          <View style={styles.waterHeader}>
            <Text style={styles.waterLabel}>Water</Text>
            <Text style={styles.waterAmount}>
              {today?.water_ml ?? 0} <Text style={styles.waterOf}>/ {DAILY_GOAL} ml</Text>
            </Text>
          </View>
          <View style={styles.waterTrack}>
            <View style={[styles.waterFill, { width: `${waterPct}%`, backgroundColor: waterPct >= 75 ? colors.scoreHigh : colors.accent }]} />
          </View>
          <View style={styles.waterButtons}>
            <Button title="+250 ml" variant="soft" small onPress={() => addWater(250)} />
            <Button title="+500 ml" variant="soft" small onPress={() => addWater(500)} />
            {today?.water_ml ? <Button title="Reset" variant="ghost" small onPress={() => persist({ water_ml: 0 })} /> : null}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.dietSection}>
          <Text style={styles.dietLabel}>Diet signals</Text>
          <View style={styles.chipRow}>
            <Chip
              label={dairy ? 'Dairy: yes' : 'Dairy: no'}
              active={dairy}
              onPress={toggleDairy}
              icon={<Ionicons name="fast-food-outline" size={14} color={dairy ? colors.white : colors.textMuted} />}
            />
            <Chip
              label={sugar ? 'Sugar: yes' : 'Sugar: no'}
              active={sugar}
              onPress={toggleSugar}
              icon={<Ionicons name="ice-cream-outline" size={14} color={sugar ? colors.white : colors.textMuted} />}
            />
          </View>
          <TextField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. had pizza, slept 7h, used new cleanser…"
            multiline
            style={styles.notes}
          />
          <Button title="Save notes" variant="secondary" small onPress={saveNotes} />
        </View>
      </Card>

      {/* Honest patterns */}
      {pattern ? (
        <>
          <SectionTitle title="Your patterns" />
          <Card style={styles.patternCard}>
            <PatternRow label="Days with dairy" value={pattern.withDairy} compared={pattern.withoutDairy} />
            <PatternRow label="Days without dairy" value={pattern.withoutDairy} compared={pattern.withDairy} />
            <PatternRow label="Days with sugar" value={pattern.withSugar} compared={pattern.withoutSugar} />
            <PatternRow label="Days without sugar" value={pattern.withoutSugar} compared={pattern.withSugar} />
            <PatternRow label="Hydrated days (≥1.5L)" value={pattern.hydrated} compared={pattern.lessHydrated} />
            <PatternRow label="Lower-water days" value={pattern.lessHydrated} compared={pattern.hydrated} />
            <Text style={styles.patternNote}>
              Average skin score per group. This is an observed pattern from your own data — not proof of cause and effect.
            </Text>
          </Card>
        </>
      ) : null}

      {/* History */}
      <SectionTitle title="Recent days" />
      {logs.length === 0 ? (
        loaded ? (
          <Card>
            <EmptyState emoji="💧" title="No habit entries yet" subtitle="Quick-log water and diet here every day to spot your own patterns." />
          </Card>
        ) : null
      ) : (
        <Card style={styles.historyCard}>
          <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
            {logs.slice(0, 14).map((h) => (
              <View key={h.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>{formatRelative(h.date)} · {formatDateKey(h.date)}</Text>
                  <Text style={styles.historyMeta}>
                    💧 {h.water_ml ?? 0} ml{h.dairy ? ' · 🥛 dairy' : ''}{h.sugar ? ' · 🍬 sugar' : ''}{h.diet_notes ? ` · “${h.diet_notes}”` : ''}
                  </Text>
                </View>
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.textFaint}
                  onPress={() => {
                    deleteHabitLog(h.id).then(load);
                  }}
                />
              </View>
            ))}
          </ScrollView>
        </Card>
      )}
    </Screen>
  );
}

function PatternRow({ label, value, compared }: { label: string; value: number | null; compared: number | null }) {
  if (value === null) {
    return (
      <View style={styles.patternRow}>
        <Text style={styles.patternLabel}>{label}</Text>
        <Text style={styles.patternValueMuted}>no data</Text>
      </View>
    );
  }
  const diff = compared !== null ? value - compared : 0;
  const color = diff > 1 ? colors.scoreHigh : diff < -1 ? colors.scoreLow : colors.textMuted;
  return (
    <View style={styles.patternRow}>
      <Text style={styles.patternLabel}>{label}</Text>
      <View style={styles.patternRight}>
        <Text style={[styles.patternValue, { color }]}>{value}</Text>
        {compared !== null && diff !== 0 ? (
          <Text style={[styles.patternDiff, { color }]}>{diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  sub: { ...typography.body, color: colors.textMuted, marginTop: 4, lineHeight: 20 },
  todayCard: { gap: spacing.lg },
  waterSection: { gap: spacing.md },
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  waterLabel: { ...typography.h3, color: colors.text },
  waterAmount: { ...typography.h3, color: colors.text },
  waterOf: { ...typography.small, color: colors.textFaint, fontWeight: '400' },
  waterTrack: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  waterFill: { height: '100%', borderRadius: 5 },
  waterButtons: { flexDirection: 'row', gap: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border },
  dietSection: { gap: spacing.md },
  dietLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  notes: { minHeight: 60, textAlignVertical: 'top' },
  patternCard: { gap: spacing.md },
  patternRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patternLabel: { ...typography.body, color: colors.text, flex: 1 },
  patternRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patternValue: { ...typography.h3, color: colors.text },
  patternValueMuted: { ...typography.body, color: colors.textFaint },
  patternDiff: { fontSize: 12, fontWeight: '700' },
  patternNote: { ...typography.caption, color: colors.textFaint, lineHeight: 17 },
  historyCard: { paddingVertical: spacing.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  historyDate: { ...typography.h3, color: colors.text },
  historyMeta: { ...typography.small, color: colors.textMuted, marginTop: 2 },
});
