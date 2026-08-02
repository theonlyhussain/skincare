import { getDb } from './database';
import type { HabitLog } from '../types';

interface HabitRow {
  id: number;
  date: string;
  water_ml: number | null;
  dairy: number | null;
  sugar: number | null;
  diet_notes: string | null;
}

function parseRow(row: HabitRow): HabitLog {
  return {
    id: row.id,
    date: row.date,
    water_ml: row.water_ml,
    dairy: row.dairy === 1,
    sugar: row.sugar === 1,
    diet_notes: row.diet_notes,
  };
}

export async function upsertHabitLog(log: {
  date: string;
  water_ml: number | null;
  dairy: boolean;
  sugar: boolean;
  diet_notes: string | null;
}): Promise<number> {
  const db = await getDb();
  const existing = await db.getFirstAsync<HabitRow>(
    'SELECT * FROM habit_logs WHERE date = ?',
    log.date
  );
  if (existing) {
    await db.runAsync(
      'UPDATE habit_logs SET water_ml = ?, dairy = ?, sugar = ?, diet_notes = ? WHERE id = ?',
      log.water_ml,
      log.dairy ? 1 : 0,
      log.sugar ? 1 : 0,
      log.diet_notes,
      existing.id
    );
    return existing.id;
  }
  const result = await db.runAsync(
    'INSERT INTO habit_logs (date, water_ml, dairy, sugar, diet_notes) VALUES (?, ?, ?, ?, ?)',
    log.date,
    log.water_ml,
    log.dairy ? 1 : 0,
    log.sugar ? 1 : 0,
    log.diet_notes
  );
  return result.lastInsertRowId;
}

export async function getHabitLogs(): Promise<HabitLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HabitRow>('SELECT * FROM habit_logs ORDER BY date DESC, id DESC');
  return rows.map(parseRow);
}

export async function getHabitLog(date: string): Promise<HabitLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<HabitRow>('SELECT * FROM habit_logs WHERE date = ?', date);
  return row ? parseRow(row) : null;
}

export async function deleteHabitLog(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM habit_logs WHERE id = ?', id);
}
