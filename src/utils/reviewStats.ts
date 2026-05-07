import type { CompletionProof, FocusSession, Task } from '@/types';
import { getTaskFocusSeconds } from '@/utils/time';

export type ReviewTaskWithProof = {
  task: Task;
  proof?: CompletionProof;
};

export type ReviewStats = {
  totalCount: number;
  completedCount: number;
  partialCount: number;
  unfinishedCount: number;
  completionRate: number;
  totalFocusSeconds: number;
  proofPhotos: CompletionProof[];
  completedTasks: ReviewTaskWithProof[];
  partialTasks: ReviewTaskWithProof[];
  unfinishedTasks: ReviewTaskWithProof[];
};

function proofImageUri(proof: CompletionProof): string | undefined {
  return proof.thumbnailUri ?? proof.imageUri ?? proof.localUri;
}

function getProofForTask(task: Task, proofs: CompletionProof[]): CompletionProof | undefined {
  if (task.completionProofId) {
    const proof = proofs.find((item) => item.id === task.completionProofId);

    if (proof) {
      return proof;
    }
  }

  return proofs.find((proof) => proof.taskId === task.id);
}

function isCompleted(task: Task, proof?: CompletionProof): boolean {
  return task.status === 'completed' || proof?.completionStatus === 'exceeded' || task.completionStatus === 'exceeded';
}

function isPartial(task: Task, proof?: CompletionProof): boolean {
  return !isCompleted(task, proof) && (task.status === 'partial' || proof?.completionStatus === 'partial');
}

export function buildReviewStats(
  tasks: Task[],
  focusSessions: FocusSession[],
  proofs: CompletionProof[],
): ReviewStats {
  const taskRows = tasks.map((task) => ({ task, proof: getProofForTask(task, proofs) }));
  const completedTasks = taskRows.filter(({ task, proof }) => isCompleted(task, proof));
  const partialTasks = taskRows.filter(({ task, proof }) => isPartial(task, proof));
  const unfinishedTasks = taskRows.filter(
    ({ task, proof }) => !isCompleted(task, proof) && !isPartial(task, proof),
  );
  const totalFocusSecondsFromSessions = focusSessions.reduce(
    (sum, session) => sum + Math.max(0, session.durationSeconds),
    0,
  );
  const totalFocusSecondsFromTasks = tasks.reduce(
    (sum, task) => sum + getTaskFocusSeconds(task),
    0,
  );
  const completedCount = completedTasks.length;
  const totalCount = tasks.length;

  return {
    totalCount,
    completedCount,
    partialCount: partialTasks.length,
    unfinishedCount: unfinishedTasks.length,
    completionRate: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
    totalFocusSeconds:
      totalFocusSecondsFromSessions > 0 ? totalFocusSecondsFromSessions : totalFocusSecondsFromTasks,
    proofPhotos: proofs.filter((proof) => Boolean(proofImageUri(proof))),
    completedTasks,
    partialTasks,
    unfinishedTasks,
  };
}

export function getProofImageUri(proof?: CompletionProof): string | undefined {
  return proof ? proofImageUri(proof) : undefined;
}
