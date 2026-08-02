import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const SCHEMA = `
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS skin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    photo_uri TEXT NOT NULL,
    subscores TEXT NOT NULL,
    score INTEGER NOT NULL,
    ai_reasoning TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    photo_uri TEXT,
    ingredients TEXT,
    price REAL,
    added_date TEXT
  );

  CREATE TABLE IF NOT EXISTS habit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    water_ml INTEGER,
    dairy INTEGER DEFAULT 0,
    sugar INTEGER DEFAULT 0,
    diet_notes TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_skin_logs_date ON skin_logs(date);
  CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);
`;

/** Opens (and lazily initializes) the app database. Safe to call repeatedly. */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('skincare.db');
  await db.execAsync(SCHEMA);
  return db;
}

export async function initDatabase(): Promise<void> {
  await getDb();
}
