import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { analyzeSkinPhoto, getApiKey } from '../ai/client';
import { getModel } from '../db/settings';
import { preparePhoto, persistPhoto } from '../utils/images';
import { getLatestSkinLog, addSkinLog } from '../db/skinLogs';
import { todayKey } from '../utils/format';
import { colors, spacing, typography } from '../theme';
import { Button, tapHaptic } from '../components/ui';
import ScoreRing from '../components/ScoreRing';
import SubscoreList from '../components/SubscoreList';
import type { SkinLog as SkinLogType, SkinSubscores } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SkinLog'>;

type Stage =
  | { name: 'permission' }
  | { name: 'camera' }
  | { name: 'review' }
  | { name: 'analyzing' }
  | { name: 'result' }
  | { name: 'error' };

export default function SkinLogScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [flash, setFlash] = useState(false);
  const [stage, setStage] = useState<Stage>({ name: 'permission' });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<{ uri: string; base64: string } | null>(null);
  const capturingRef = useRef(false);
  const [result, setResult] = useState<{ subscores: SkinSubscores; score: number; reasoning: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (permission?.granted) setStage({ name: 'camera' });
    else if (permission) setStage({ name: 'permission' });
  }, [permission]);

  const goToSettings = () => {
    navigation.navigate('Tabs', { screen: 'SettingsTab' });
  };

  const capture = async () => {
    if (!cameraRef.current || capturingRef.current) return;
    capturingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      setPhotoUri(picture.uri);
      setStage({ name: 'review' });
    } finally {
      capturingRef.current = false;
    }
  };

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setStage({ name: 'review' });
    }
  };

  const analyze = async () => {
    if (!photoUri) return;
    setStage({ name: 'analyzing' });
    setErrorMsg('');
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        setErrorMsg('Add your AI API key in Settings first. SkinCare never stores it anywhere else.');
        setStage({ name: 'error' });
        return;
      }
      const model = await getModel();
      const previous = await getLatestSkinLog();
      const prep = await preparePhoto(photoUri);
      setPrepared(prep);
      const analysis = await analyzeSkinPhoto({ apiKey, model, imageBase64: prep.base64, previous });
      setResult(analysis);
      setStage({ name: 'result' });
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Something went wrong. Please try again.');
      setStage({ name: 'error' });
    }
  };

  const save = async () => {
    if (!prepared || !result) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const durableUri = await persistPhoto(prepared.uri);
      const id = await addSkinLog({
        date: todayKey(),
        photo_uri: durableUri,
        subscores: result.subscores,
        score: result.score,
        ai_reasoning: result.reasoning,
      });
      navigation.replace('LogDetail', { logId: id });
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Could not save this entry.');
      setStage({ name: 'error' });
    }
  };

  const retake = () => {
    setPhotoUri(null);
    setPrepared(null);
    setResult(null);
    setStage({ name: 'camera' });
  };

  const close = () => navigation.goBack();

  // ---------------- rendering ----------------
  const showHeader = stage.name !== 'camera';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Skin check</Text>
          <Ionicons name="close" size={26} color={colors.text} onPress={close} style={styles.close} />
        </View>
      ) : null}

      {stage.name === 'permission' && (
        <View style={styles.centerStage}>
          <Ionicons name="camera-outline" size={56} color={colors.primary} />
          <Text style={styles.stageTitle}>Camera access needed</Text>
          <Text style={styles.stageSub}>We need your camera to take consistent, well-lit face photos for scoring.</Text>
          <Button title="Allow camera" onPress={requestPermission} style={styles.stageButton} />
          <Button title="Choose from library instead" variant="ghost" onPress={pickFromLibrary} />
        </View>
      )}

      {stage.name === 'camera' && (
        <View style={styles.cameraWrap}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            flash={flash ? 'on' : 'off'}
            animateShutter
          />
          {/* Guidance overlay */}
          <View style={styles.guide}>
            <Text style={styles.guideText}>Face the light, keep your face in the oval, look straight ahead</Text>
            <View style={[styles.oval, { width: width * 0.66, height: width * 0.82 }]} />
          </View>

          <View style={[styles.cameraControls, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.cameraTopRow}>
              <RoundBtn icon={facing === 'front' ? 'sync' : 'sync'} onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} label="Flip" />
              <RoundBtn
                icon={flash ? 'flash' : 'flash-off'}
                onPress={() => setFlash((f) => !f)}
                label="Flash"
                active={flash}
              />
              <RoundBtn icon="images-outline" onPress={pickFromLibrary} label="Library" />
            </View>
            <View style={styles.shutterRow}>
              <View style={styles.shutterOuter}>
                <View style={styles.shutterInner} onTouchEnd={capture} />
              </View>
            </View>
            <Text style={styles.cancelText} onPress={close}>Cancel</Text>
          </View>
        </View>
      )}

      {stage.name === 'review' && photoUri && (
        <View style={styles.centerStage}>
          <Image source={{ uri: photoUri }} style={[styles.previewImage, { aspectRatio: 3 / 4 }]} />
          <Text style={styles.previewHint}>
            This photo is sent to your AI provider (with your own key) for scoring. Check the lighting and framing.
          </Text>
          <Button title="Analyze my skin" onPress={analyze} style={styles.stageButton} />
          <View style={styles.rowButtons}>
            <Button title="Retake" variant="secondary" onPress={retake} style={{ flex: 1 }} />
            <Button title="Pick another" variant="ghost" onPress={pickFromLibrary} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {stage.name === 'analyzing' && (
        <View style={styles.centerStage}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stageTitle}>Analyzing your skin…</Text>
          <Text style={styles.stageSub}>Sending to the vision model. This can take 10–30 seconds.</Text>
        </View>
      )}

      {stage.name === 'error' && (
        <View style={styles.centerStage}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.stageTitle}>Couldn't analyze</Text>
          <Text style={[styles.stageSub, { color: colors.danger }]}>{errorMsg}</Text>
          <View style={styles.rowButtons}>
            <Button title="Try again" onPress={analyze} style={{ flex: 1 }} />
            <Button title="Retake" variant="secondary" onPress={retake} style={{ flex: 1 }} />
          </View>
          {errorMsg.includes('API key') ? (
            <Button title="Open Settings" variant="ghost" onPress={goToSettings} />
          ) : null}
        </View>
      )}

      {stage.name === 'result' && result && (
        <View style={styles.resultWrap}>
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Today's skin score</Text>
            <View style={styles.resultTop}>
              <ScoreRing score={result.score} />
              <View style={styles.resultSide}>
                <Text style={styles.resultReasoning} numberOfLines={6}>
                  {result.reasoning}
                </Text>
              </View>
            </View>
            <View style={styles.resultSubscores}>
              <SubscoreList subscores={result.subscores} />
            </View>
          </View>
          <View style={styles.resultActions}>
            <Button title="Save entry" onPress={save} style={styles.stageButton} />
            <Button title="Log another" variant="secondary" onPress={retake} />
          </View>
        </View>
      )}
    </View>
  );
}

function RoundBtn({
  icon,
  onPress,
  label,
  active,
}: {
  icon: any;
  onPress: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <View style={styles.roundBtnWrap}>
      <View
        style={[styles.roundBtn, active && styles.roundBtnActive]}
        onTouchEnd={() => {
          tapHaptic();
          onPress();
        }}
      >
        <Ionicons name={icon} size={22} color={active ? colors.primaryDark : colors.white} />
      </View>
      <Text style={styles.roundBtnLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: { ...typography.h1, color: colors.text },
  close: { position: 'absolute', right: spacing.lg, top: spacing.md },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: 14,
  },
  stageTitle: { ...typography.h1, color: colors.text, textAlign: 'center', marginTop: 8 },
  stageSub: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  stageButton: { alignSelf: 'stretch', marginTop: 8 },
  cameraWrap: { flex: 1 },
  guide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  guideText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
    marginTop: 40,
  },
  oval: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cameraControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: 18,
    backgroundColor: 'rgba(20,14,12,0.35)',
    paddingTop: 14,
  },
  cameraTopRow: { flexDirection: 'row', gap: 36 },
  roundBtnWrap: { alignItems: 'center', gap: 4 },
  roundBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBtnActive: { backgroundColor: colors.primarySoft },
  roundBtnLabel: { color: colors.white, fontSize: 11, fontWeight: '600' },
  shutterRow: { alignItems: 'center' },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
  },
  cancelText: { color: colors.white, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  previewImage: { width: '100%', borderRadius: 20 },
  previewHint: { ...typography.small, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  rowButtons: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  resultWrap: { flex: 1, padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  resultLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase', textAlign: 'center' },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  resultSide: { flex: 1 },
  resultReasoning: { ...typography.body, color: colors.textMuted, lineHeight: 21 },
  resultSubscores: { marginTop: 4 },
  resultActions: { gap: spacing.md },
});
