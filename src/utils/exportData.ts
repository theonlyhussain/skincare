import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getDb } from '../db/database';
import { deleteAllPhotos } from './images';

export interface AppData {
  exported_at: string;
  skin_logs: any[];
  products: any[];
  habit_logs: any[];
  settings: { key: string; value: string }[];
}

/** Reads every table and returns a JSON-serializable snapshot of all user data. */
export async function collectAllData(): Promise<AppData> {
  const db = await getDb();
  const skinLogs = await db.getAllAsync('SELECT * FROM skin_logs ORDER BY date ASC');
  const products = await db.getAllAsync('SELECT * FROM products ORDER BY id ASC');
  const habitLogs = await db.getAllAsync('SELECT * FROM habit_logs ORDER BY date ASC');
  const settings = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
  return {
    exported_at: new Date().toISOString(),
    skin_logs: skinLogs,
    products,
    habit_logs: habitLogs,
    settings,
  };
}

/** Writes all data to a JSON file in the document directory and shares it. */
export async function exportAllData(): Promise<string> {
  const data = await collectAllData();
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory unavailable.');
  }
  const fileName = `skincare-export-${Date.now()}.json`;
  const uri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(data, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (Platform.OS === 'web') {
    return uri;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export SkinCare data' });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
  return uri;
}

/** Deletes all rows from every table and removes stored photos. Keeps the database file. */
export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM skin_logs');
    await db.runAsync('DELETE FROM products');
    await db.runAsync('DELETE FROM habit_logs');
    await db.runAsync('DELETE FROM settings');
  });
  await deleteAllPhotos();
}
