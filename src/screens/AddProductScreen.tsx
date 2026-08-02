import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { analyzeProductPhoto, getApiKey } from '../ai/client';
import { getModel } from '../db/settings';
import { preparePhoto, persistPhoto } from '../utils/images';
import { addProduct } from '../db/products';
import { todayKey } from '../utils/format';
import { colors, spacing, typography } from '../theme';
import { Button, Card, TextField, SectionTitle } from '../components/ui';
import type { Ingredient } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddProduct'>;

type Stage = 'camera' | 'review' | 'analyzing' | 'edit' | 'error';

export default function AddProductScreen({ navigation }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setStage('review');
    }
  };

  const capture = async () => {
    if (!cameraRef.current) return;
    const pic = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    setPhotoUri(pic.uri);
    setStage('review');
  };

  const analyze = async () => {
    if (!photoUri) return;
    setStage('analyzing');
    setErrorMsg('');
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        setErrorMsg('Add your AI API key in Settings first.');
        setStage('error');
        return;
      }
      const model = await getModel();
      const prep = await preparePhoto(photoUri);
      const result = await analyzeProductPhoto({ apiKey, model, imageBase64: prep.base64 });
      const durableUri = await persistPhoto(prep.uri);
      setPhotoUri(durableUri);
      setName(result.name ?? '');
      setIngredients(result.ingredients);
      setStage('edit');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Could not read the label. Try a clearer photo.');
      setStage('error');
    }
  };

  const updateIngredient = (index: number, patch: Partial<Ingredient>) => {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)));
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const parsedPrice = price.trim() === '' ? null : Number(price);
      await addProduct({
        name: name.trim() || null,
        photo_uri: photoUri,
        ingredients,
        price: parsedPrice !== null && Number.isFinite(parsedPrice) ? parsedPrice : null,
        added_date: todayKey(),
      });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {stage === 'camera' && (
        <View style={styles.stage}>
          {permission?.granted ? (
            <CameraView ref={cameraRef} style={styles.cameraFull} facing="back" animateShutter />
          ) : (
            <View style={styles.centerStage}>
              <Ionicons name="scan-outline" size={54} color={colors.primary} />
              <Text style={styles.stageTitle}>Photograph the label</Text>
              <Text style={styles.stageSub}>
                Take a clear photo of the ingredient list. SkinCare reads it with AI — no OCR needed.
              </Text>
              <Button title="Allow camera" onPress={requestPermission} style={styles.stageButton} />
            </View>
          )}
          <View style={styles.cameraBottom}>
            <View style={styles.cameraActions}>
              <Button title="Choose from library" variant="secondary" onPress={pickFromLibrary} style={{ flex: 1 }} />
              {permission?.granted ? (
                <Button title="Take photo" onPress={capture} style={{ flex: 1 }} />
              ) : (
                <Button title="Allow camera" onPress={requestPermission} style={{ flex: 1 }} />
              )}
            </View>
            <Text style={styles.hint}>Tip: flatten the label and get close, with even lighting.</Text>
          </View>
        </View>
      )}

      {stage === 'review' && photoUri && (
        <View style={styles.stage}>
          <ScrollView contentContainerStyle={styles.centerStage}>
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="contain" />
            <Text style={styles.stageSub}>Is the label readable? The photo will be sent to your AI provider.</Text>
            <Button title="Extract ingredients" onPress={analyze} style={styles.stageButton} />
            <View style={styles.rowButtons}>
              <Button title="Retake" variant="secondary" onPress={() => setStage('camera')} style={{ flex: 1 }} />
              <Button title="Pick another" variant="ghost" onPress={pickFromLibrary} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      )}

      {stage === 'analyzing' && (
        <View style={styles.centerStage}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stageTitle}>Reading the label…</Text>
          <Text style={styles.stageSub}>Extracting the product name and ingredients.</Text>
        </View>
      )}

      {stage === 'error' && (
        <View style={styles.centerStage}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.stageTitle}>Couldn't read the label</Text>
          <Text style={[styles.stageSub, { color: colors.danger }]}>{errorMsg}</Text>
          <Button title="Try again" onPress={analyze} style={styles.stageButton} />
          <Button title="Enter manually" variant="ghost" onPress={() => { setIngredients([]); setStage('edit'); }} />
        </View>
      )}

      {stage === 'edit' && (
        <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.editTitle}>Review & save</Text>
          <Text style={styles.editSub}>Tweak anything the AI misread — you can edit ingredients individually.</Text>

          <SectionTitle title="Details" />
          <Card style={styles.editCard}>
            <TextField label="Product name" value={name} onChangeText={setName} placeholder="e.g. Gentle Gel Cleanser" />
            <TextField
              label="Price (optional)"
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 24.99"
              keyboardType="decimal-pad"
            />
          </Card>

          <SectionTitle title={`Ingredients (${ingredients.length})`} />
          <Card style={styles.editCard}>
            {ingredients.length === 0 ? (
              <Text style={styles.noIngredients}>No ingredients detected — add them manually below.</Text>
            ) : (
              ingredients.map((ing, index) => (
                <View key={index} style={styles.ingRow}>
                  <TextField
                    value={ing.name}
                    onChangeText={(t) => updateIngredient(index, { name: t })}
                    placeholder="Ingredient name"
                  />
                  <TextField
                    value={ing.function ?? ''}
                    onChangeText={(t) => updateIngredient(index, { function: t })}
                    placeholder="function (e.g. exfoliant)"
                  />
                  <Ionicons name="close-circle" size={22} color={colors.danger} onPress={() => removeIngredient(index)} />
                </View>
              ))
            )}
            <Button
              title="Add ingredient"
              variant="ghost"
              small
              icon={<Ionicons name="add" size={16} color={colors.primaryDark} />}
              onPress={() => setIngredients((prev) => [...prev, { name: '', function: '' }])}
            />
          </Card>

          <Button
            title={saving ? 'Saving…' : 'Save product'}
            onPress={save}
            loading={saving}
            style={styles.saveButton}
          />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  stage: { flex: 1 },
  cameraFull: { flex: 1 },
  centerStage: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: 14 },
  stageTitle: { ...typography.h1, color: colors.text, textAlign: 'center' },
  stageSub: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  stageButton: { alignSelf: 'stretch', marginTop: 8 },
  cameraBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,14,12,0.4)',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  cameraActions: { flexDirection: 'row', gap: spacing.md },
  hint: { ...typography.caption, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  preview: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16, backgroundColor: colors.surfaceAlt },
  rowButtons: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  editContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  editTitle: { ...typography.h1, color: colors.text, marginTop: spacing.sm },
  editSub: { ...typography.body, color: colors.textMuted, marginTop: 4 },
  editCard: { gap: spacing.md },
  noIngredients: { ...typography.body, color: colors.textMuted },
  ingRow: { gap: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  saveButton: { marginTop: spacing.xl },
});
