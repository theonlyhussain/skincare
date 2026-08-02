import React, { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { TabScreenProps } from '../navigation';
import { getProducts } from '../db/products';
import { getBudget } from '../db/settings';
import { findConflicts } from '../ai/conflicts';
import { colors, spacing, typography } from '../theme';
import { Screen, Card, Button, EmptyState } from '../components/ui';
import type { Product, ProductConflict } from '../types';

type Props = TabScreenProps<'ShelfTab'>;

export default function ShelfScreen({ navigation }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [conflicts, setConflicts] = useState<ProductConflict[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [shelf, budgetVal] = await Promise.all([getProducts(), getBudget()]);
    setProducts(shelf);
    setBudget(budgetVal);
    setConflicts(findConflicts(shelf));
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalSpent = products.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const overBudget = budget !== null && totalSpent > budget;

  const renderProduct = ({ item }: { item: Product }) => {
    const productConflicts = conflicts.filter((c) => c.products.includes(item.name ?? 'Unnamed product'));
    return (
      <View style={styles.productCard}>
        <View
          style={styles.productPhoto}
          onTouchEnd={() => navigation.navigate('ProductDetail', { productId: item.id })}
        >
          {item.photo_uri ? (
            <Image source={{ uri: item.photo_uri }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.productPlaceholder}>
              <Ionicons name="cube-outline" size={30} color={colors.primary} />
            </View>
          )}
          {productConflicts.length ? (
            <View style={styles.warnBadge}>
              <Ionicons name="warning" size={11} color={colors.white} />
              <Text style={styles.warnBadgeText}>{productConflicts.length}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.productMeta}>
          <Text numberOfLines={2} style={styles.productName}>
            {item.name ?? 'Unnamed product'}
          </Text>
          <Text style={styles.productPrice}>
            {item.price != null ? `$${item.price.toFixed(2)}` : '—'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Product shelf</Text>
          <Text style={styles.sub}>{products.length} products · {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} flagged</Text>
        </View>
        <Button title="Add" small icon={<Ionicons name="add" size={18} color={colors.white} />} onPress={() => navigation.navigate('AddProduct')} />
      </View>

      {budget !== null ? (
        <Card style={[styles.budgetCard, overBudget && styles.budgetOver]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.budgetLabel}>{overBudget ? 'Over budget' : 'Budget used'}</Text>
            <Text style={[styles.budgetAmount, overBudget && { color: colors.danger }]}>
              ${totalSpent.toFixed(2)} <Text style={styles.budgetOf}>/ ${budget.toFixed(2)}</Text>
            </Text>
          </View>
          <Text style={styles.budgetPct}>{Math.min(999, Math.round((totalSpent / budget) * 100))}%</Text>
        </Card>
      ) : null}

      {loaded && products.length === 0 ? (
        <View style={{ flex: 1 }}>
          <Card>
            <EmptyState
              emoji="🧴"
              title="Your shelf is empty"
              subtitle="Photograph each product's label and SkinCare will extract the ingredients and flag conflicting actives."
              action={
                <Button title="Add your first product" onPress={() => navigation.navigate('AddProduct')} />
              }
            />
          </Card>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { ...typography.h1, color: colors.text },
  sub: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  budgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  budgetOver: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  budgetLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase' },
  budgetAmount: { ...typography.h2, color: colors.text, marginTop: 2 },
  budgetOf: { ...typography.small, color: colors.textFaint, fontWeight: '400' },
  budgetPct: { ...typography.h2, color: colors.accentDark },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2 },
  gridRow: { gap: spacing.md, marginBottom: spacing.md },
  productCard: { flex: 1, gap: 8 },
  productPhoto: {
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  productImage: { width: '100%', height: '100%' },
  productPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  warnBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.warn,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  warnBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  productMeta: { paddingHorizontal: 2 },
  productName: { ...typography.h3, color: colors.text },
  productPrice: { ...typography.small, color: colors.textMuted, marginTop: 2 },
});
