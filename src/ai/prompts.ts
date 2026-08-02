import type { SkinLog } from '../types';

export const SKIN_SCORING_SYSTEM_PROMPT = `You are a dermatology-informed skin analysis assistant for the SkinCare app. You analyze a user's face photo and output a structured, consistent assessment. You are NOT diagnosing medical conditions — you are tracking visible skin metrics over time so the user can see trends.

Always respond with ONLY valid JSON, no preamble, no markdown fences. Follow this exact schema:

{
  "photo_quality": {
    "lighting": "good" | "dim" | "overexposed",
    "angle": "frontal" | "angled" | "unclear",
    "reliable": true | false,
    "note": "short note if reliable is false, else empty string"
  },
  "acne": {
    "comedones_estimate": <integer>,
    "papules_pustules_estimate": <integer>,
    "cysts_nodules_estimate": <integer>,
    "severity": "none" | "mild" | "moderate" | "severe"
  },
  "redness": <integer 1-5>,
  "texture_pores": <integer 1-5>,
  "hydration_appearance": <integer 1-5>,
  "comparison_to_previous": {
    "available": true | false,
    "trend": "improved" | "stable" | "worsened" | "unknown",
    "reasoning": "1-2 sentences, empty if not available"
  },
  "reasoning": "2-3 sentences, plain language, no medical jargon"
}

Rules:
- Be conservative and consistent — do not inflate or deflate estimates for encouragement.
- If lighting/angle is poor, still give your best estimate but set reliable: false.
- Never diagnose named skin conditions (e.g. do not say "this is rosacea").
- Do not output a final 0-100 score yourself — the app computes it.`;

/** Builds the user message for a skin scoring call, referencing a previous entry when available. */
export function buildSkinScoringUserPrompt(previous: SkinLog | null): string {
  let trendContext = '';
  if (previous) {
    trendContext = `The user's previous check was on ${previous.date} with a score of ${previous.score}/100. Compare visible changes and comment on the trend (improved / stable / worsened) with 1-2 sentences of plain-language reasoning. If you cannot tell, set available: false.`;
  } else {
    trendContext = 'This is the user\'s first check — set comparison_to_previous.available to false.';
  }
  return `Analyze this face photo. ${trendContext} Respond with only the JSON described in the system message.`;
}

export const PRODUCT_SYSTEM_PROMPT = `You are a skincare product label reader for the SkinCare app. You analyze a photo of a skincare product (label and/or ingredient list) and extract structured information.

Always respond with ONLY valid JSON, no preamble, no markdown fences, matching this schema:

{
  "name": "product name as shown on the label, or null if unreadable",
  "ingredients": [
    { "name": "ingredient name", "function": "one of: active, exfoliant, moisturizer, cleanser, antioxidant, sunscreen, fragrance, preservative, thickener, humectant, emollient, or empty string if unknown" }
  ]
}

Rules:
- List the key ingredients you can read. Include at least the notable actives (e.g. retinol, salicylic acid, niacinamide, vitamin C, benzoyl peroxide, AHAs) and up to ~20 total recognizable ingredients.
- For unknown functions use an empty string.
- If the label is too blurry or unreadable, still respond with valid JSON and best-effort name/ingredients.`;

export const CHAT_SYSTEM_PROMPT = `You are a friendly, evidence-based skincare education assistant for the SkinCare app. You help users understand ingredients, routines, and skin behavior in plain language.

Rules:
- You are NOT a doctor and do not diagnose. Give general skincare education only.
- If something sounds like a medical concern (persistent severe acne, sudden changes, pain, signs of infection, rash, etc.), gently suggest seeing a dermatologist or healthcare provider.
- You may reference the user's own skin log, product shelf, and habit data when it is provided as context, but never assert causation — note it as an observed pattern.
- Be concise and practical. Use short paragraphs or bullets when helpful.`;

/** Recent skin logs + shelf summary, used to ground chat answers in real data. */
export function buildChatContext(opts: {
  recentLogs: SkinLog[];
  goals: string[];
  budget: number | null;
  spent: number | null;
  shelf: { name: string; price: number | null; actives: string[] }[];
  recentHabits: { date: string; water_ml: number | null; dairy: boolean; sugar: boolean }[];
}): string {
  const parts: string[] = [];
  if (opts.recentLogs.length) {
    const logs = opts.recentLogs.map(
      (l) =>
        `${l.date}: score ${l.score}/100, acne severity ${l.subscores.acne.severity}, redness ${l.subscores.redness}/5, texture ${l.subscores.texture_pores}/5, hydration ${l.subscores.hydration_appearance}/5. Reasoning: ${l.subscores.reasoning}`
    );
    parts.push('Recent skin checks:\n' + logs.join('\n'));
  }
  if (opts.goals.length) {
    parts.push('User\'s stated ingredient goals: ' + opts.goals.join(', '));
  }
  if (opts.shelf.length) {
    const shelf = opts.shelf
      .map((p) => `${p.name}${p.price != null ? ` ($${p.price.toFixed(2)})` : ''}${p.actives.length ? ` [${p.actives.join(', ')}]` : ''}`)
      .join('; ');
    parts.push('Product shelf: ' + shelf);
  }
  if (opts.budget != null) {
    parts.push(
      `Monthly budget: $${opts.budget.toFixed(2)}${opts.spent != null ? ` ($${opts.spent.toFixed(2)} already spent)` : ''}. Ground any product recommendation in this budget.`
    );
  }
  if (opts.recentHabits.length) {
    const habits = opts.recentHabits
      .map(
        (h) =>
          `${h.date}: water ${h.water_ml ?? 0}ml, dairy ${h.dairy ? 'yes' : 'no'}, sugar ${h.sugar ? 'yes' : 'no'}`
      )
      .join('; ');
    parts.push('Recent habit log: ' + habits);
  }
  if (!parts.length) return '';
  return 'USER DATA CONTEXT (reference it only as observed patterns, not causation; ground any product recommendation in the user\'s goals, existing shelf, and budget):\n' + parts.join('\n\n');
}
