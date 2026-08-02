import * as SecureStore from 'expo-secure-store';
import type { Ingredient, SkinLog, SkinSubscores } from '../types';
import { computeScore, extractJsonObject, normalizeSubscores } from './scoring';
import {
  buildChatContext,
  buildSkinScoringUserPrompt,
  CHAT_SYSTEM_PROMPT,
  PRODUCT_SYSTEM_PROMPT,
  SKIN_SCORING_SYSTEM_PROMPT,
} from './prompts';

const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const API_KEY_STORE = 'glm_api_key';

export const AVAILABLE_MODELS = [
  { id: 'glm-4v-flash', label: 'GLM-4V Flash', note: 'Free — good for most checks' },
  { id: 'glm-4v-plus', label: 'GLM-4V Plus', note: 'Higher accuracy, paid' },
] as const;

// ---------------------------------------------------------------------------
// API key (secure storage)
// ---------------------------------------------------------------------------

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(API_KEY_STORE);
  } catch {
    return null;
  }
}

export async function setApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY_STORE, key.trim());
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_STORE);
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function friendlyError(status: number, body: string): string {
  if (status === 401) return 'Invalid API key. Check it in Settings — keys look like a long string of letters and digits.';
  if (status === 402) return 'Your GLM account has no balance. Add credit at open.bigmodel.cn.';
  if (status === 429) return 'Rate limit hit — please wait a moment and try again.';
  if (status >= 500) return 'The AI service is having issues. Please try again shortly.';
  return `Request failed (${status}). ${body.slice(0, 200)}`;
}

// ---------------------------------------------------------------------------
// Core HTTP call (OpenAI-compatible GLM v4 endpoint)
// ---------------------------------------------------------------------------

interface GlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | { type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }[];
}

async function callGLM(opts: {
  apiKey: string;
  model: string;
  messages: GlmMessage[];
}): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({ model: opts.model, messages: opts.messages }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ApiError(friendlyError(response.status, body), response.status);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.length) {
    throw new ApiError('The AI returned an empty response. Please try again.');
  }
  return content;
}

// ---------------------------------------------------------------------------
// Skin photo analysis
// ---------------------------------------------------------------------------

export async function analyzeSkinPhoto(opts: {
  apiKey: string;
  model: string;
  imageBase64: string;
  previous: SkinLog | null;
}): Promise<{ subscores: SkinSubscores; score: number; reasoning: string }> {
  const raw = await callGLM({
    apiKey: opts.apiKey,
    model: opts.model,
    messages: [
      { role: 'system', content: SKIN_SCORING_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${opts.imageBase64}` },
          },
          { type: 'text', text: buildSkinScoringUserPrompt(opts.previous) },
        ],
      },
    ],
  });

  const parsed = extractJsonObject(raw);
  if (!parsed) {
    throw new ApiError('Could not read the AI response. Please try again.');
  }
  const subscores = normalizeSubscores(parsed);
  const score = computeScore({
    acne: subscores.acne,
    redness: subscores.redness,
    texture_pores: subscores.texture_pores,
    hydration_appearance: subscores.hydration_appearance,
  });
  return { subscores, score, reasoning: subscores.reasoning };
}

// ---------------------------------------------------------------------------
// Product label analysis
// ---------------------------------------------------------------------------

export async function analyzeProductPhoto(opts: {
  apiKey: string;
  model: string;
  imageBase64: string;
}): Promise<{ name: string | null; ingredients: Ingredient[] }> {
  const raw = await callGLM({
    apiKey: opts.apiKey,
    model: opts.model,
    messages: [
      { role: 'system', content: PRODUCT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${opts.imageBase64}` },
          },
          { type: 'text', text: 'Extract the product name and ingredient list from this label photo.' },
        ],
      },
    ],
  });

  const parsed = extractJsonObject(raw);
  if (!parsed) {
    throw new ApiError('Could not read the label. Please try again with a clearer photo.');
  }
  const ingredients: Ingredient[] = Array.isArray(parsed.ingredients)
    ? parsed.ingredients
        .map((i: any) => ({
          name: typeof i?.name === 'string' ? i.name.trim() : '',
          function: typeof i?.function === 'string' ? i.function.trim() : '',
        }))
        .filter((i: any) => i.name.length > 0)
    : [];
  const name = typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : null;
  return { name, ingredients };
}

// ---------------------------------------------------------------------------
// Text chat (skin Q&A)
// ---------------------------------------------------------------------------

export async function chat(opts: {
  apiKey: string;
  model: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  includeContext: boolean;
  context: {
    recentLogs: SkinLog[];
    goals: string[];
    budget: number | null;
    spent: number | null;
    shelf: { name: string; price: number | null; actives: string[] }[];
    recentHabits: { date: string; water_ml: number | null; dairy: boolean; sugar: boolean }[];
  };
}): Promise<string> {
  const last = opts.messages[opts.messages.length - 1];
  if (!last) {
    throw new ApiError('No message to send.');
  }
  const contextBlock = opts.includeContext ? buildChatContext(opts.context) : '';
  const userText = contextBlock ? `${contextBlock}\n\nUser question: ${last.content}` : last.content;

  const history = opts.messages
    .slice(0, -1)
    .map((m) => ({ role: m.role, content: m.content }));

  return callGLM({
    apiKey: opts.apiKey,
    model: opts.model,
    messages: [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userText },
    ],
  });
}
