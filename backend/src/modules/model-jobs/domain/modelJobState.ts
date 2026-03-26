import { MODEL_JOB_STATUS, type ModelJobStatus } from "./modelJobRepository";

const KNOWN_MODEL_JOB_STATUSES: readonly ModelJobStatus[] = [
  MODEL_JOB_STATUS.QUEUED,
  MODEL_JOB_STATUS.FEATURE_EXTRACTION_RUNNING,
  MODEL_JOB_STATUS.FEATURE_EXTRACTION_COMPLETED,
  MODEL_JOB_STATUS.FEATURE_MATCHING_RUNNING,
  MODEL_JOB_STATUS.FEATURE_MATCHING_COMPLETED,
  MODEL_JOB_STATUS.SPARSE_MAPPING_RUNNING,
  MODEL_JOB_STATUS.SPARSE_MAPPING_COMPLETED,
  MODEL_JOB_STATUS.COMPLETED,
  MODEL_JOB_STATUS.FAILED,
] as const;

export function normalizeModelJobStatus(status: string): ModelJobStatus {
  if (KNOWN_MODEL_JOB_STATUSES.includes(status as ModelJobStatus)) {
    return status as ModelJobStatus;
  }
  throw new Error(`Unknown model job status: ${status}`);
}

export function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  if (progress < 0) return 0;
  if (progress > 100) return 100;
  return Math.round(progress);
}
