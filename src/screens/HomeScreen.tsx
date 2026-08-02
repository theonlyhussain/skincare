import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { TabScreenProps } from '../navigation';
import { getSkinLogs } from '../db/skinLogs';
import { getHabitLog, upsertHabitLog } from '../db/habits';
import { todayKey, formatRelative, formatDateLong } from '../utils/format';
import { colors, scoreColor, spacing, typography, shadows } from '../theme';
import { Screen, Card, Button, SectionTitle, EmptyState } from '../components/ui';
import ScoreRing from '../components/ScoreRing';
import ScoreChart from '../components/ScoreChart';
import type { ScorePoint, SkinLog } from '../types';

type Props = TabScreenProps<'HomeTab'>;

export default function HomeScreen({ navigation }: Props) {
  const [logs, setLogs] = useState<SkinLog[]>([]);
  const [waterToday, setWaterToday] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [skinLogs, habit] = await Promise.all([
      getSkinLogs(),
      getHabitLog(todayKey()),
    ]);
    setLogs(skinLogs);
    setWaterToday(habit?.water_ml ?? 0);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const latest = logs.length ? logs[logs.length - 1] : null;
  const previous = logs.length > 1 ? logs[logs.length - 2] : null;
  const trend = latest && previous ? latest.score - previous.score : null;

  const points: ScorePoint[] = logs.map((l) => ({
    date: l.date,
    value: l.score,
    logId: l.id,
  }));

  const addWater = async (ml: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Read the full row first so we never wipe today's diet entries.
    const habit = await getHabitLog(todayKey());
    const next = (habit?.water_ml ?? 0) + ml;
    setWaterToday(next);
    await upsertHabitLog({
      date: todayKey(),
      water_ml: next,
      dairy: habit?.dairy ?? false,
      sugar: habit?.sugar ?? false,
      diet_notes: habit?.diet_notes ?? null,
    });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>SkinCare</Text>
          <Text style={styles.sub}>{greeting} — {formatDateLong(todayKey())}</Text>
        </View>
      </View>

      {/* Latest check */}
      {latest ? (
        <Card style={styles.latestCard}>
          <View style={styles.latestRow}>
            <ScoreRing score={latest.score} />
            <View style={styles.latestInfo}>
              <Text style={styles.latestLabel}>{formatRelative(latest.date)}</Text>
              {trend !== null && trend !== 0 ? (
                <View style={[styles.trendRow, { backgroundColor: trend > 0 ? colors.accentSoft : colors.dangerSoft }]}>
                  <Ionicons
                    name={trend > 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={trend > 0 ? colors.accentDark : colors.danger}
                  />
                  <Text style={[styles.trendText, { color: trend > 0 ? colors.accentDark : colors.danger }]}>
                    {trend > 0 ? '+' : ''}{trend} vs last check
                  </Text>
                </View>
              ) : (
                <View style={[styles.trendRow, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[styles.trendText, { color: colors.textMuted }]}>First check</Text>
                </View>
              )}
              <Text numberOfLines={3} style={styles.reasoning}>
                {latest.subscores.reasoning || latest.ai_reasoning || 'No reasoning saved.'}
              </Text>
              <Button
                title="View details"
                variant="ghost"
                small
                onPress={() => navigation.navigate('LogDetail', { logId: latest.id })}
              />
            </View>
          </View>
        </Card>
      ) : (
        <Card style={styles.onboardCard}>
          <EmptyState
            emoji="🧴"
            title="Welcome to SkinCare"
            subtitle="Track your skin with AI-powered photo checks. Your data stays on your device."
            action={
              <Button
                title="Start your first check"
                onPress={() => navigation.navigate('SkinLog')}
              />
            }
          />
        </Card>
      )}

      {/* Quick actions */}
      <SectionTitle title="Quick actions" />
      <View style={styles.quickRow}>
        <QuickAction
          icon="camera"
          color={colors.primary}
          bg={colors.primarySoft}
          label="Log skin"
          onPress={() => navigation.navigate('SkinLog')}
        />
        <QuickAction
          icon="water"
          color={colors.accentDark}
          bg={colors.accentSoft}
          label="+250ml water"
          onPress={() => addWater(250)}
        />
        <QuickAction
          icon="cube"
          color={colors.warn}
          bg={colors.warnSoft}
          label="Add product"
          onPress={() => navigation.navigate('AddProduct')}
        />
      </View>

      {/* Water today */}
      <Card style={styles.waterCard}>
        <View style={styles.waterRow}>
          <View style={styles.waterIcon}>
            <Ionicons name="water" size={18} color={colors.accentDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.waterTitle}>Water today</Text>
            <Text style={styles.waterAmount}>{waterToday} ml</Text>
          </View>
          <View style={styles.waterChips}>
            <AddChip label="+250" onPress={() => addWater(250)} />
            <AddChip label="+500" onPress={() => addWater(500)} />
          </View>
        </View>
      </Card>

      {/* Trend chart */}
      {logs.length >= 1 ? (
        <>
          <SectionTitle title="Your progress" />
          <Card style={styles.chartCard}>
            <ScoreChart
              points={points}
              onSelectPoint={(p) => navigation.navigate('LogDetail', { logId: p.logId })}
            />
          </Card>
        </>
      ) : null}

      {loaded && logs.length === 0 ? (
        <Text style={styles.footnote}>Checks you log will show up here as a trend line.</Text>
      ) : null}
    </Screen>
  );
}

function QuickAction({
  icon,
  color,
  bg,
  label,
  onPress,
}: {
  icon: any;
  color: string;
  bg: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <View style={[styles.quickItem, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.quickLabel, { color }]}>{label}</Text>
      <View style={styles.quickTouch}>
        <Button title="Go" variant="ghost" small onPress={onPress} />
      </View>
    </View>
  );
}

function AddChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.addChip}>
      <Text style={styles.addChipText} onPress={onPress}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.sm, marginBottom: spacing.lg },
  brand: { ...typography.title, color: colors.text },
  sub: { ...typography.body, color: colors.textMuted, marginTop: 2 },
  latestCard: { padding: spacing.lg },
  latestRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  latestInfo: { flex: 1, gap: 8 },
  latestLabel: { ...typography.h3, color: colors.text },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  trendText: { fontSize: 12, fontWeight: '700' },
  reasoning: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  onboardCard: { paddingVertical: spacing.md },
  quickRow: { flexDirection: 'row', gap: spacing.md },
  quickItem: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: 6,
    alignItems: 'flex-start',
  },
  quickLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  quickTouch: { marginTop: 6, alignSelf: 'stretch' },
  waterCard: { marginTop: spacing.md, padding: spacing.lg },
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waterIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterTitle: { ...typography.h3, color: colors.text },
  waterAmount: { ...typography.body, color: colors.accentDark, fontWeight: '700', marginTop: 2 },
  waterChips: { flexDirection: 'row', gap: 6 },
  addChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  addChipText: { color: colors.accentDark, fontSize: 13, fontWeight: '700' },
  chartCard: { paddingTop: spacing.lg, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  footnote: { ...typography.small, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xl },
});
