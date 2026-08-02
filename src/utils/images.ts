import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const PHOTOS_DIR_NAME = 'photos';
export const MAX_UPLOAD_WIDTH = 1024;

export interface PreparedPhoto {
  uri: string; // resized JPEG in cache (temporary)
  base64: string;
}

/**
 * Resizes + compresses a photo for upload (keeps API payloads small) and returns
 * both the cache URI and the base64 payload for the AI request.
 */
export async function preparePhoto(uri: string, maxWidth = MAX_UPLOAD_WIDTH): Promise<PreparedPhoto> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: maxWidth });
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.75,
    base64: true,
  });
  return { uri: result.uri, base64: result.base64 ?? '' };
}

/** Copies a (possibly temporary) photo into the app's document directory and returns the durable URI. */
export async function persistPhoto(sourceUri: string): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory unavailable.');
  }
  const dir = `${FileSystem.documentDirectory}${PHOTOS_DIR_NAME}`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const name = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const dest = `${dir}/${name}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

/** Reads a local image file as base64 (for sending to the AI when not already prepared). */
export async function photoToBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

/** Removes the app's photo store (used by "delete all data"). */
export async function deleteAllPhotos(): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  const dir = `${FileSystem.documentDirectory}${PHOTOS_DIR_NAME}`;
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}
