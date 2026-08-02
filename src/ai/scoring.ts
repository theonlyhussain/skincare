import type { SkinSubscores } from '../types';

/**
 * Computes the 0-100 skin score in app code — the AI never outputs the final score.
 * Implemented exactly as specified in the product spec.
 */
export function computeScore(params: {
  acne: SkinSubscores['acne'];
  redness: number;
  texture_pores: number;
  hydration_appearance: number;
}): number {
  const severityPenalty = { none: 0, mild: 8, moderate: 18, severe: 30 }[params.acne.severity] ?? 0;
  const lesionPenalty = Math.min(
    20,
    params.acne.comedones_estimate * 0.5 +
      params.acne.papules_pustules_estimate * 1.5 +
      params.acne.cysts_nodules_estimate * 3
  );
  const rednessPenalty = (params.redness - 1) * 5;
  const texturePenalty = (params.texture_pores - 1) * 4;
  const hydrationBonus = (params.hydration_appearance - 3) * 2;

  const score =
    100 - severityPenalty - lesionPenalty - rednessPenalty - texturePenalty + hydrationBonus;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Extracts the first balanced JSON object from a model reply (tolerates fences/preamble). */
export function extractJsonObject(text: string): any | null {
  const cleaned = text
    .replace(/```(?:json)?/gi, '')
    .trim();
  // Find the first '{' and try to match a balanced object.
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const candidate = cleaned.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }
  // Fallback: naive parse of the whole cleaned string.
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** Coerces a raw parsed JSON object into a well-formed SkinSubscores. */
export function normalizeSubscores(raw: any): SkinSubscores {
  const acne = raw?.acne ?? {};
  return {
    photo_quality: {
      lighting: (['good', 'dim', 'overexposed'].includes(raw?.photo_quality?.lighting)
        ? raw.photo_quality.lighting
        : 'dim') as SkinSubscores['photo_quality']['lighting'],
      angle: (['frontal', 'angled', 'unclear'].includes(raw?.photo_quality?.angle)
        ? raw.photo_quality.angle
        : 'unclear') as SkinSubscores['photo_quality']['angle'],
      reliable: raw?.photo_quality?.reliable !== false,
      note: asString(raw?.photo_quality?.note, ''),
    },
    acne: {
      comedones_estimate: clampInt(acne.comedones_estimate, 0, 100, 0),
      papules_pustules_estimate: clampInt(acne.papules_pustules_estimate, 0, 100, 0),
      cysts_nodules_estimate: clampInt(acne.cysts_nodules_estimate, 0, 100, 0),
      severity: (['none', 'mild', 'moderate', 'severe'].includes(acne.severity)
        ? acne.severity
        : 'mild') as SkinSubscores['acne']['severity'],
    },
    redness: clampInt(raw?.redness, 1, 5, 1),
    texture_pores: clampInt(raw?.texture_pores, 1, 5, 1),
    hydration_appearance: clampInt(raw?.hydration_appearance, 1, 5, 3),
    comparison_to_previous: {
      available: raw?.comparison_to_previous?.available === true,
      trend: (['improved', 'stable', 'worsened', 'unknown'].includes(
        raw?.comparison_to_previous?.trend
      )
        ? raw.comparison_to_previous.trend
        : 'unknown') as SkinSubscores['comparison_to_previous']['trend'],
      reasoning: asString(raw?.comparison_to_previous?.reasoning, ''),
    },
    reasoning: asString(raw?.reasoning, ''),
  };
}
