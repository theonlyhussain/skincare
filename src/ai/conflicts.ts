import type { Ingredient, Product, ProductConflict } from '../types';

/**
 * Well-known conflicting ingredient families. Matching is substring-based against
 * lowercase ingredient names — static rules only, no AI judgment involved.
 */
const FAMILIES: Record<string, string[]> = {
  retinoid: ['retinol', 'retinal', 'retinoate', 'tretinoin', 'adapalene', 'tazarotene', 'differin'],
  bpo: ['benzoyl peroxide'],
  aha: ['glycolic acid', 'lactic acid', 'mandelic acid', 'citric acid', 'malic acid', 'tartaric acid'],
  bha: ['salicylic acid', 'betaine salicylate'],
  vitaminC: ['ascorbic acid', 'l-ascorbic', 'ascorbyl', 'tetrahexyldecyl ascorbate', 'vitamin c', '3-o-ethyl ascorbic acid'],
  niacinamide: ['niacinamide', 'nicotinamide'],
  azelaic: ['azelaic acid'],
  dryingAlcohol: ['alcohol denat', 'denatured alcohol', 'isopropyl alcohol'],
};

type FamilyKey = keyof typeof FAMILIES;

const RULES: {
  a: FamilyKey;
  b: FamilyKey;
  type: ProductConflict['type'];
  title: string;
  message: string;
}[] = [
  {
    a: 'retinoid',
    b: 'bpo',
    type: 'high',
    title: 'Retinoid + Benzoyl peroxide',
    message: 'A classic but very irritating pairing. Use benzoyl peroxide in the morning and the retinoid at night, or alternate days.',
  },
  {
    a: 'retinoid',
    b: 'aha',
    type: 'high',
    title: 'Retinoid + AHA exfoliant',
    message: 'Two strong exfoliants in one routine can strip the skin barrier. Alternate nights and never layer them.',
  },
  {
    a: 'retinoid',
    b: 'bha',
    type: 'high',
    title: 'Retinoid + BHA exfoliant',
    message: 'Retinoids and salicylic acid together risk irritation and dryness. Use on separate days or at opposite ends of the day.',
  },
  {
    a: 'retinoid',
    b: 'vitaminC',
    type: 'mild',
    title: 'Retinoid + Vitamin C',
    message: 'Both are strong actives. Common workaround: vitamin C in the morning, retinoid at night.',
  },
  {
    a: 'aha',
    b: 'bha',
    type: 'medium',
    title: 'AHA + BHA exfoliants',
    message: 'Two types of chemical exfoliant in the same routine can over-exfoliate. Use them on alternating days.',
  },
  {
    a: 'bpo',
    b: 'bha',
    type: 'medium',
    title: 'Benzoyl peroxide + BHA',
    message: 'Salicylic acid and benzoyl peroxide can be very drying together. Introduce slowly and use a good moisturizer.',
  },
  {
    a: 'retinoid',
    b: 'azelaic',
    type: 'mild',
    title: 'Retinoid + Azelaic acid',
    message: 'Often prescribed together, but can sting initially. Start with low frequency and buffer with moisturizer.',
  },
  {
    a: 'aha',
    b: 'dryingAlcohol',
    type: 'medium',
    title: 'AHA + Drying alcohol',
    message: 'Alcohol-denatured formulas make an AHA more irritating. Consider an alcohol-free formula.',
  },
];

/** Returns which families a product's ingredients contain (deduped, first match per family). */
export function detectFamilies(ingredients: Ingredient[]): { family: FamilyKey; matched: string }[] {
  const found: { family: FamilyKey; matched: string }[] = [];
  const text = ingredients.map((i) => i.name.toLowerCase()).join(' ');

  (Object.keys(FAMILIES) as FamilyKey[]).forEach((family) => {
    for (const term of FAMILIES[family]) {
      if (text.includes(term)) {
        found.push({ family, matched: term });
        break;
      }
    }
  });
  return found;
}

/** Finds conflicts across the user's whole shelf using the static rules table. */
export function findConflicts(products: Product[]): ProductConflict[] {
  const byFamily = new Map<FamilyKey, { product: Product; matched: string }[]>();
  for (const product of products) {
    const families = detectFamilies(product.ingredients);
    for (const { family, matched } of families) {
      const list = byFamily.get(family) ?? [];
      list.push({ product, matched });
      byFamily.set(family, list);
    }
  }

  const conflicts: ProductConflict[] = [];
  for (const rule of RULES) {
    const a = byFamily.get(rule.a) ?? [];
    const b = byFamily.get(rule.b) ?? [];
    if (!a.length || !b.length) continue;

    // A conflict exists as long as the two families are on the shelf together.
    const involved = [...a, ...b];
    const productNames = Array.from(new Set(involved.map((x) => x.product.name ?? 'Unnamed product')));
    const ingredientTerms = Array.from(new Set(involved.map((x) => x.matched)));

    conflicts.push({
      type: rule.type,
      title: rule.title,
      message: rule.message,
      products: productNames,
      ingredients: ingredientTerms,
    });
  }
  return conflicts;
}

/** Summarizes the shelf for chat context. */
export function summarizeShelf(products: Product[]): string {
  if (!products.length) return '';
  return products
    .map((p) => {
      const actives = detectFamilies(p.ingredients)
        .map((f) => f.family)
        .join(', ');
      return `${p.name ?? 'Unnamed'}${actives ? ` (${actives})` : ''}`;
    })
    .join('; ');
}
