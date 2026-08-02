import * as FileSystem from 'expo-file-system/legacy';

/** Deletes a local file if it exists; never throws on a missing file. */
export async function deleteFile(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // best effort — orphaned files are harmless
  }
}
