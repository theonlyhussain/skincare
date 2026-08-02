import { getDb } from './database';

export const SETTING_KEYS = {
  budget: 'budget',
  model: 'model',
  goals: 'goals',
} as const;

/** Ingredient goals the user can state — used to ground product recommendations in their actual aims. */
export const GOAL_OPTIONS = [
  { id: 'antioxidant', label: 'Antioxidants', note: 'Vitamin C, niacinamide' },
  { id: 'exfoliant', label: 'Gentle exfoliation', note: 'AHA / BHA' },
  { id: 'hydration', label: 'Deep hydration', note: 'Hyaluronic acid, ceramides' },
  { id: 'acne', label: 'Acne control', note: 'Salicylic acid, retinoids' },
  { id: 'sun', label: 'Sun protection', note: 'Daily SPF' },
] as const;

export type GoalId = (typeof GOAL_OPTIONS)[number]['id'];

export const DEFAULT_MODEL = 'glm-4v-flash';

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}

export async function getBudget(): Promise<number | null> {
  const raw = await getSetting(SETTING_KEYS.budget);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function setBudget(budget: number | null): Promise<void> {
  if (budget === null) {
    const db = await getDb();
    await db.runAsync('DELETE FROM settings WHERE key = ?', SETTING_KEYS.budget);
    return;
  }
  await setSetting(SETTING_KEYS.budget, String(budget));
}

export async function getModel(): Promise<string> {
  return (await getSetting(SETTING_KEYS.model)) ?? DEFAULT_MODEL;
}

export async function setModel(model: string): Promise<void> {
  await setSetting(SETTING_KEYS.model, model);
}

export async function getGoals(): Promise<GoalId[]> {
  const raw = await getSetting(SETTING_KEYS.goals);
  if (!raw) return [];
  return raw
    .split(',')
    .filter((id): id is GoalId => GOAL_OPTIONS.some((g) => g.id === id));
}

export async function setGoals(goals: GoalId[]): Promise<void> {
  if (!goals.length) {
    const db = await getDb();
    await db.runAsync('DELETE FROM settings WHERE key = ?', SETTING_KEYS.goals);
    return;
  }
  await setSetting(SETTING_KEYS.goals, goals.join(','));
}
