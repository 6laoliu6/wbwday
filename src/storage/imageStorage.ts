import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const PROOF_IMAGE_DIR = `${FileSystem.documentDirectory ?? ''}proof-images/`;

async function ensureProofImageDir(): Promise<void> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory is unavailable');
  }

  await FileSystem.makeDirectoryAsync(PROOF_IMAGE_DIR, { intermediates: true });
}

function createImageUri(taskId: string, suffix: string): string {
  const safeTaskId = taskId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${PROOF_IMAGE_DIR}${safeTaskId}_${Date.now()}_${suffix}.jpg`;
}

async function copyImageToProofDir(sourceUri: string, destinationUri: string): Promise<string> {
  await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
  return destinationUri;
}

export async function saveProofImage(
  taskId: string,
  sourceUri: string,
): Promise<{ imageUri: string; thumbnailUri?: string }> {
  await ensureProofImageDir();

  const imageUri = createImageUri(taskId, 'image');
  const thumbnailUri = createImageUri(taskId, 'thumb');

  try {
    const compressed = await manipulateAsync(
      sourceUri,
      [{ resize: { width: 1600 } }],
      { compress: 0.8, format: SaveFormat.JPEG },
    );
    await copyImageToProofDir(compressed.uri, imageUri);
  } catch {
    await copyImageToProofDir(sourceUri, imageUri);
  }

  try {
    const thumbnail = await manipulateAsync(
      sourceUri,
      [{ resize: { width: 400 } }],
      { compress: 0.75, format: SaveFormat.JPEG },
    );
    await copyImageToProofDir(thumbnail.uri, thumbnailUri);
    return { imageUri, thumbnailUri };
  } catch {
    return { imageUri };
  }
}

export async function deleteProofImage(imageUri?: string): Promise<void> {
  if (!imageUri) {
    return;
  }

  try {
    await FileSystem.deleteAsync(imageUri, { idempotent: true });
  } catch {
    // Deleting an old or already-missing local file should not block the UI.
  }
}
