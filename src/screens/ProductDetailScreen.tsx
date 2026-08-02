import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { getProduct, deleteProduct, updateProductPrice, getProducts } from '../db/products';
import { findConflicts } from '../ai/conflicts';
import { deleteFile } from '../utils/deleteFile';
import { formatDateLong } from '../utils/format';
import { colors, spacing, typography } from '../theme';
import { Screen, Card, Button, Badge, SectionTitle } from '../components/ui';
import type { Product, ProductConflict } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const TYPE_COLORS: Record<ProductConflict['type'], { color: string; bg: string; label: string }> = {
  high: { color: colors.danger, bg: colors.dangerSoft, label: 'High risk' },
  medium: { color: colors.warn, bg: colors.warnSoft, label: 'Caution' },
  mild: { color: colors.accentDark, bg: colors.accentSoft, label: 'Mild' },
};

export default function ProductDetailScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [conflicts, setConflicts] = useState<ProductConflict[]>([]);
  const [priceDraft, setPriceDraft] = useState('');
  const [editingPrice, setEditingPrice] = useState(false);

  const load = useCallback(async () => {
    const [p, shelf] = await Promise.all([getProduct(productId), getProducts()]);
    setProduct(p);
    setConflicts(p ? findConflicts(shelf).filter((c) => c.products.includes(p.name ?? 'Unnamed product')) : []);
    setPriceDraft(p?.price != null ? String(p.price) : '');
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!product) return <Screen />;

  const remove = () => {
    Alert.alert('Delete this product?', 'This removes the product and its photo from your device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(productId);
          await deleteFile(product.photo_uri).catch(() => {});
          navigation.goBack();
        },
      },
    ]);
  };

  const savePrice = async () => {
    const parsed = priceDraft.trim() === '' ? null : Number(priceDraft);
    const price = parsed !== null && Number.isFinite(parsed) ? parsed : null;
    await updateProductPrice(productId, price);
    setEditingPrice(false);
    load();
  };

  return (
    <Screen>
      <View style={styles.photoWrap}>
        {product.photo_uri ? (
          <Image source={{ uri: product.photo_uri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="cube-outline" size={48} color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{product.name ?? 'Unnamed product'}</Text>
        <Text style={styles.date}>Added {formatDateLong(product.added_date || new Date().toISOString().slice(0, 10))}</Text>
      </View>

      {conflicts.length > 0 ? (
        <>
          <SectionTitle title={`Conflict flags (${conflicts.length})`} />
          {conflicts.map((c, i) => {
            const t = TYPE_COLORS[c.type];
            return (
              <Card key={i} style={[styles.conflictCard, { borderColor: t.color }]}>
                <View style={styles.conflictHeader}>
                  <Badge text={t.label} color={t.color} bg={t.bg} />
                  <Text style={styles.conflictTitle}>{c.title}</Text>
                </View>
                <Text style={styles.conflictMessage}>{c.message}</Text>
                <Text style={styles.conflictProducts}>
                  Involves: {c.products.join(' · ')}
                </Text>
              </Card>
            );
          })}
        </>
      ) : null}

      <SectionTitle title="Price" />
      <Card style={styles.priceCard}>
        {editingPrice ? (
          <View style={styles.priceEdit}>
            <TextInput
              value={priceDraft}
              onChangeText={setPriceDraft}
              keyboardType="decimal-pad"
              placeholder="0.00"
              style={styles.priceInput}
              autoFocus
            />
            <Button title="Save" small onPress={savePrice} />
            <Button title="Cancel" variant="ghost" small onPress={() => { setEditingPrice(false); setPriceDraft(product.price != null ? String(product.price) : ''); }} />
          </View>
        ) : (
          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>{product.price != null ? `$${product.price.toFixed(2)}` : 'Not set'}</Text>
            <Button title="Edit" variant="soft" small onPress={() => setEditingPrice(true)} />
          </View>
        )}
      </Card>

      <SectionTitle title={`Ingredients (${product.ingredients.length})`} />
      <Card style={styles.ingredientsCard}>
        {product.ingredients.length === 0 ? (
          <Text style={styles.noIngredients}>No ingredients saved for this product.</Text>
        ) : (
          product.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingRow}>
              <Text style={styles.ingName}>{ing.name}</Text>
              {ing.function ? <Badge text={ing.function} color={colors.primaryDark} /> : null}
            </View>
          ))
        )}
      </Card>

      <View style={styles.actions}>
        <Button title="Delete product" variant="danger" onPress={remove} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoWrap: { borderRadius: 20, overflow: 'hidden', marginTop: 4, backgroundColor: colors.surfaceAlt },
  photo: { width: '100%', height: 220 },
  photoPlaceholder: { height: 180, alignItems: 'center', justifyContent: 'center' },
  titleRow: { marginTop: spacing.lg, gap: 4 },
  title: { ...typography.h1, color: colors.text },
  date: { ...typography.small, color: colors.textMuted },
  conflictCard: { gap: 8, borderWidth: 1.5, marginBottom: spacing.md },
  conflictHeader: { gap: 6 },
  conflictTitle: { ...typography.h3, color: colors.text },
  conflictMessage: { ...typography.body, color: colors.text, lineHeight: 21 },
  conflictProducts: { ...typography.small, color: colors.textMuted },
  priceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  priceValue: { ...typography.h2, color: colors.text },
  priceEdit: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  priceInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: colors.text,
  },
  ingredientsCard: { gap: spacing.md },
  ingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  ingName: { ...typography.body, color: colors.text, flex: 1 },
  noIngredients: { ...typography.body, color: colors.textMuted },
  actions: { marginTop: spacing.xl },
});
