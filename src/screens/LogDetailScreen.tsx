import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { getSkinLog, deleteSkinLog } from '../db/skinLogs';
import { deleteFile } from '../utils/deleteFile';
import { formatDateLong } from '../utils/format';
import { colors, scoreColor, spacing, typography } from '../theme';
import { Screen, Card, Button, SectionTitle } from '../components/ui';
import ScoreRing from '../components/ScoreRing';
import SubscoreList from '../components/SubscoreList';
import type { SkinLog } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'LogDetail'>;

export default function LogDetailScreen({ route, navigation }: Props) {
  const { logId } = route.params;
  const [log, setLog] = useState<SkinLog | null>(null);

  const load = useCallback(async () => {
    setLog(await getSkinLog(logId));
  }, [logId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!log) return <Screen />;

  const comparison = log.subscores.comparison_to_previous;
  const trend = comparison.available ? comparison.trend : null;

  const remove = () => {
    Alert.alert('Delete this check?', 'This removes the entry and its photo from your device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const uri = log.photo_uri;
          await deleteSkinLog(logId);
          await deleteFile(uri).catch(() => {});
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.photoWrap}>
        <Image source={{ uri: log.photo_uri }} style={styles.photo} resizeMode="cover" />
        <View style={styles.photoBadge}>
          <Text style={styles.photoBadgeText}>{formatDateLong(log.date)}</Text>
        </View>
      </View>

      <Card style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <ScoreRing score={log.score} />
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>Skin score</Text>
            {trend ? (
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor:
                      trend === 'improved' ? colors.accentSoft : trend === 'worsened' ? colors.dangerSoft : colors.surfaceAlt,
                  },
                ]}
              >
                <Ionicons
                  name={
                    trend === 'improved' ? 'trending-up' : trend === 'worsened' ? 'trending-down' : 'remove'
                  }
                  size={14}
                  color={
                    trend === 'improved' ? colors.accentDark : trend === 'worsened' ? colors.danger : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.trendText,
                    {
                      color:
                        trend === 'improved' ? colors.accentDark : trend === 'worsened' ? colors.danger : colors.textMuted,
                    },
                  ]}
                >
                  {trend === 'improved' ? 'Improved' : trend === 'worsened' ? 'Worsened' : 'Stable'}
                </Text>
              </View>
            ) : null}
            {comparison.available && comparison.reasoning ? (
              <Text style={styles.trendReasoning}>{comparison.reasoning}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.divider} />
        <SubscoreList subscores={log.subscores} />
      </Card>

      {log.subscores.reasoning ? (
        <>
          <SectionTitle title="AI summary" />
          <Card>
            <Text style={styles.reasoning}>{log.subscores.reasoning}</Text>
          </Card>
        </>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="Log another check"
          variant="secondary"
          onPress={() => navigation.navigate('SkinLog')}
        />
        <Button title="Delete entry" variant="danger" onPress={remove} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoWrap: { borderRadius: 20, overflow: 'hidden', marginTop: 4 },
  photo: { width: '100%', height: 260 },
  photoBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: colors.overlay,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  photoBadgeText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  scoreCard: { marginTop: spacing.lg, gap: spacing.lg },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  scoreInfo: { flex: 1, gap: 8 },
  scoreTitle: { ...typography.h3, color: colors.text },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  trendText: { fontSize: 12, fontWeight: '700' },
  trendReasoning: { ...typography.small, color: colors.textMuted, lineHeight: 17 },
  divider: { height: 1, backgroundColor: colors.border },
  reasoning: { ...typography.body, color: colors.text, lineHeight: 22 },
  actions: { gap: spacing.md, marginTop: spacing.xl },
});
