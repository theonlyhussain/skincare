import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SkinSubscores } from '../types';
import { colors, spacing, typography } from '../theme';
import { Badge } from './ui';

function barColor(value: number, goodDirection: 'low' | 'high'): string {
  // value 1-5. For 'low', lower is better (redness, texture); for 'high', higher is better (hydration).
  const normalized = goodDirection === 'low' ? 6 - value : value;
  if (normalized >= 4) return colors.scoreHigh;
  if (normalized >= 3) return colors.scoreMid;
  return colors.scoreLow;
}

function SubscoreRow({
  label,
  value,
  goodDirection,
}: {
  label: string;
  value: number;
  goodDirection: 'low' | 'high';
}) {
  const color = barColor(value, goodDirection);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${value * 20}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.rowValue, { color }]}>{value}/5</Text>
    </View>
  );
}

const severityColor: Record<string, string> = {
  none: colors.scoreHigh,
  mild: colors.scoreMid,
  moderate: colors.warn,
  severe: colors.scoreLow,
};

export default function SubscoreList({ subscores }: { subscores: SkinSubscores }) {
  const { acne, photo_quality } = subscores;

  return (
    <View style={styles.wrap}>
      {!photo_quality.reliable ? (
        <View style={styles.warnBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.warn} />
          <Text style={styles.warnText}>
            {photo_quality.note || 'Photo quality was low — score may be less reliable.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Acne</Text>
        <View style={styles.acneRow}>
          <Badge text={`Severity: ${acne.severity}`} color={severityColor[acne.severity] ?? colors.textMuted} />
          <Text style={styles.acneDetail}>
            {acne.comedones_estimate} comedones · {acne.papules_pustules_estimate} papules · {acne.cysts_nodules_estimate} cysts
          </Text>
        </View>
      </View>

      <SubscoreRow label="Redness" value={subscores.redness} goodDirection="low" />
      <SubscoreRow label="Texture & pores" value={subscores.texture_pores} goodDirection="low" />
      <SubscoreRow label="Hydration look" value={subscores.hydration_appearance} goodDirection="high" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warnSoft,
    borderRadius: 10,
    padding: 10,
  },
  warnText: { flex: 1, fontSize: 12, color: colors.warn, fontWeight: '500', lineHeight: 17 },
  section: { gap: 6 },
  sectionLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase' },
  acneRow: { gap: 6 },
  acneDetail: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLabel: { width: 108, ...typography.small, color: colors.text },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  rowValue: { width: 34, textAlign: 'right', fontSize: 12, fontWeight: '700' },
});
