import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors, scoreColor, spacing, typography } from '../theme';
import type { ScorePoint } from '../types';

interface Props {
  points: ScorePoint[];
  onSelectPoint: (point: ScorePoint) => void;
  height?: number;
}

export default function ScoreChart({ points, onSelectPoint, height = 220 }: Props) {
  if (points.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No skin checks yet</Text>
      </View>
    );
  }

  const data = points.map((p) => ({
    value: p.value,
    label: shortLabel(p.date),
    onPress: () => onSelectPoint(p),
    dataPointColor: scoreColor(p.value),
  }));

  return (
    <View>
      <LineChart
        data={data}
        height={height}
        curved
        thickness={3}
        color={colors.primary}
        areaChart
        startFillColor={colors.primary}
        endFillColor={colors.primarySoft}
        startOpacity={0.28}
        endOpacity={0.04}
        dataPointsRadius={5}
        dataPointsColor={colors.primary}
        hideRules={false}
        rulesType="solid"
        rulesColor={colors.chartGrid}
        yAxisColor="transparent"
        xAxisColor="transparent"
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        noOfSections={4}
        formatYLabel={(v) => String(Math.round(Number(v)))}
        adjustToWidth
        yAxisLabelWidth={30}
        showVerticalLines={false}
        spacing={points.length > 1 ? Math.max(36, Math.min(72, 260 / points.length)) : 40}
        pointerConfig={{
          pointerStripHeight: height - 30,
          pointerStripColor: colors.border,
          pointerStripWidth: 1.5,
          pointerColor: colors.primary,
          radius: 6,
          activatePointersOnLongPress: true,
          pointerLabelComponent: () => null,
        }}
      />
      <Text style={styles.hint}>Tap a point to view that check</Text>
    </View>
  );
}

function shortLabel(dateKey: string): string {
  // 'YYYY-MM-DD' -> 'MM/DD'
  const [, m, d] = dateKey.split('-');
  return `${m}/${d}`;
}

const styles = StyleSheet.create({
  empty: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { ...typography.body, color: colors.textFaint },
  axisText: { fontSize: 10, color: colors.textFaint },
  hint: {
    ...typography.caption,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
