import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from './storageKeys';
import { updateTask } from './taskRepository';
import { nowIso, toDateKey } from '@/utils/date';
import type { CompletionProof, CompletionStatus, ISODateString } from '@/types';

type CompletionProofInput = {
  date?: ISODateString;
  imageUri?: string;
  thumbnailUri?: string;
  note?: string;
  completionStatus: CompletionStatus;
  actualResult?: string;
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeProof(proof: CompletionProof): CompletionProof {
  return {
    ...proof,
    imageUri: proof.imageUri ?? proof.localUri,
    note: proof.note ?? proof.reflection ?? '',
    completionStatus: proof.completionStatus ?? 'completed',
    createdAt: proof.createdAt ?? nowIso(),
  };
}

async function readProofs(): Promise<CompletionProof[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.completionProofs);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeProof) : [];
  } catch {
    return [];
  }
}

async function writeProofs(proofs: CompletionProof[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.completionProofs, JSON.stringify(proofs));
}

function sortProofs(proofs: CompletionProof[]): CompletionProof[] {
  return [...proofs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function mapCompletionStatusToTaskStatus(completionStatus: CompletionStatus) {
  return completionStatus === 'partial' ? 'partial' : 'completed';
}

export async function getCompletionProofById(id?: string): Promise<CompletionProof | undefined> {
  if (!id) {
    return undefined;
  }

  const proofs = await readProofs();
  return proofs.find((proof) => proof.id === id);
}

export async function getCompletionProofsByTaskId(taskId: string): Promise<CompletionProof[]> {
  const proofs = await readProofs();
  return sortProofs(proofs.filter((proof) => proof.taskId === taskId));
}

export async function getLatestCompletionProofByTaskId(
  taskId: string,
): Promise<CompletionProof | undefined> {
  const proofs = await getCompletionProofsByTaskId(taskId);
  return proofs[0];
}

export async function saveCompletionProof(
  taskId: string,
  input: CompletionProofInput,
  existingProofId?: string,
): Promise<CompletionProof> {
  const proofs = await readProofs();
  const timestamp = nowIso();
  const existingProof = existingProofId
    ? proofs.find((proof) => proof.id === existingProofId)
    : undefined;

  const proof: CompletionProof = {
    id: existingProof?.id ?? createId('proof'),
    taskId,
    date: input.date ?? existingProof?.date ?? toDateKey(),
    imageUri: input.imageUri,
    thumbnailUri: input.thumbnailUri,
    note: input.note?.trim() ?? '',
    completionStatus: input.completionStatus,
    actualResult: input.actualResult?.trim() ?? '',
    createdAt: existingProof?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const nextProofs = existingProof
    ? proofs.map((item) => (item.id === proof.id ? proof : item))
    : [...proofs, proof];

  await writeProofs(nextProofs);

  await updateTask(taskId, {
    status: mapCompletionStatusToTaskStatus(proof.completionStatus),
    completionProofId: proof.id,
    completionProofIds: Array.from(
      new Set([
        ...proofs.filter((item) => item.taskId === taskId).map((item) => item.id),
        proof.id,
      ]),
    ),
    proofThumbnailUri: proof.thumbnailUri,
    proofImageUri: proof.imageUri,
    completionStatus: proof.completionStatus,
    actualResult: proof.actualResult,
    completionReflection: proof.note,
    completedAt: timestamp,
  });

  return proof;
}
