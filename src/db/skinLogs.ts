import { getDb } from './database';
import type { SkinLog, SkinSubscores } from '../types';

interface SkinLogRow {
  id: number;
  date: string;
  photo_uri: string;
  subscores: string;
  score: number;
  ai_reasoning: string | null;
}

function parseRow(row: SkinLogRow): SkinLog {
  let subscores: SkinSubscores;
  try {
    subscores = JSON.parse(row.subscores) as SkinSubscores;
  } catch {
    subscores = {
      photo_quality: { lighting: 'dim', angle: 'unclear', reliable: false, note: '' },
      acne: { comedones_estimate: 0, papules_pustules_estimate: 0, cysts_nodules_estimate: 0, severity: 'none' },
      redness: 1,
      texture_pores: 1,
      hydration_appearance: 3,
      comparison_to_previous: { available: false, trend: 'unknown', reasoning: '' },
      reasoning: '',
    };
  }
  return {
    id: row.id,
    date: row.date,
    photo_uri: row.photo_uri,
    subscores,
    score: row.score,
    ai_reasoning: row.ai_reasoning,
  };
}

export async function addSkinLog(log: {
  date: string;
  photo_uri: string;
  subscores: SkinSubscores;
  score: number;
  ai_reasoning: string | null;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO skin_logs (date, photo_uri, subscores, score, ai_reasoning) VALUES (?, ?, ?, ?, ?)',
    log.date,
    log.photo_uri,
    JSON.stringify(log.subscores),
    log.score,
    log.ai_reasoning
  );
  return result.lastInsertRowId;
}

export async function getSkinLogs(): Promise<SkinLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SkinLogRow>('SELECT * FROM skin_logs ORDER BY date ASC, id ASC');
  return rows.map(parseRow);
}

export async function getSkinLog(id: number): Promise<SkinLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SkinLogRow>('SELECT * FROM skin_logs WHERE id = ?', id);
  return row ? parseRow(row) : null;
}

/** Most recent log, or null when the journal is empty. */
export async function getLatestSkinLog(): Promise<SkinLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SkinLogRow>('SELECT * FROM skin_logs ORDER BY date DESC, id DESC LIMIT 1');
  return row ? parseRow(row) : null;
}

export async function deleteSkinLog(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM skin_logs WHERE id = ?', id);
}

export async function countSkinLogs(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM skin_logs');
  return row?.count ?? 0;
}
