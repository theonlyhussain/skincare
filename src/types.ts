// Shared types for the SkinCare app.

export type Severity = 'none' | 'mild' | 'moderate' | 'severe';
export type Lighting = 'good' | 'dim' | 'overexposed';
export type Angle = 'frontal' | 'angled' | 'unclear';
export type Trend = 'improved' | 'stable' | 'worsened' | 'unknown';

export interface AcneSubscore {
  comedones_estimate: number;
  papules_pustules_estimate: number;
  cysts_nodules_estimate: number;
  severity: Severity;
}

export interface PhotoQualitySubscore {
  lighting: Lighting;
  angle: Angle;
  reliable: boolean;
  note: string;
}

export interface ComparisonSubscore {
  available: boolean;
  trend: Trend;
  reasoning: string;
}

/** Raw structured output returned by the vision model for a skin photo. */
export interface SkinSubscores {
  photo_quality: PhotoQualitySubscore;
  acne: AcneSubscore;
  redness: number; // 1-5
  texture_pores: number; // 1-5
  hydration_appearance: number; // 1-5
  comparison_to_previous: ComparisonSubscore;
  reasoning: string;
}

export interface SkinLog {
  id: number;
  date: string; // YYYY-MM-DD (local)
  photo_uri: string;
  subscores: SkinSubscores;
  score: number; // 0-100, computed in app code
  ai_reasoning: string | null;
}

export interface Ingredient {
  name: string;
  function?: string; // e.g. 'exfoliant', 'moisturizer', 'active'
}

export interface Product {
  id: number;
  name: string | null;
  photo_uri: string | null;
  ingredients: Ingredient[];
  price: number | null;
  added_date: string; // YYYY-MM-DD
}

export interface HabitLog {
  id: number;
  date: string; // YYYY-MM-DD
  water_ml: number | null;
  dairy: boolean;
  sugar: boolean;
  diet_notes: string | null;
}

export interface ProductConflict {
  type: 'high' | 'medium' | 'mild';
  title: string;
  message: string;
  products: string[]; // product names involved
  ingredients: string[]; // the offending ingredient families
}

export interface ScorePoint {
  date: string;
  value: number;
  logId: number;
}
